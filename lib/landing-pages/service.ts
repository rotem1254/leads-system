import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/service";
import type { LandingPage, LandingPageWithOwner } from "@/types/landing-page";

function requireService(): SupabaseClient {
  const s = getServiceClient();
  if (!s) {
    const err = new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    (err as Error & { code: string }).code = "SERVICE_UNAVAILABLE";
    throw err;
  }
  return s;
}

export function generatePublicToken(): string {
  return `lp_${randomBytes(16).toString("hex")}`;
}

function slugifyBase(name: string): string {
  const t = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return t || "page";
}

async function authEmailMap(supabase: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) map.set(u.id, u.email ?? "");
    if (users.length < 200) break;
    page += 1;
    if (page > 50) break;
  }
  return map;
}

export async function getLandingPageByToken(
  token: string
): Promise<LandingPage | null> {
  const supabase = requireService();
  const { data, error } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("public_token", token.trim())
    .maybeSingle();
  if (error) throw error;
  return data as LandingPage | null;
}

export async function listLandingPagesScoped(params: {
  role: "admin" | "client";
  userId: string;
}): Promise<LandingPageWithOwner[]> {
  const supabase = requireService();
  let q = supabase.from("landing_pages").select("*").order("created_at", { ascending: false });

  if (params.role === "client") {
    q = q.eq("user_id", params.userId);
  }

  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as LandingPage[];

  if (params.role === "admin" && rows.length > 0) {
    const ids = [...new Set(rows.map((r) => r.user_id))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const emailById = await authEmailMap(supabase);
    const nameById = new Map(
      (profs ?? []).map((p) => [p.id, (p as { full_name: string }).full_name])
    );

    return rows.map((r) => ({
      ...r,
      owner_name: nameById.get(r.user_id) ?? null,
      owner_email: emailById.get(r.user_id) ?? null,
    }));
  }

  return rows.map((r) => ({ ...r }));
}

export async function createLandingPage(input: {
  name: string;
  slug?: string;
  user_id: string;
  is_active?: boolean;
}): Promise<LandingPage> {
  const supabase = requireService();
  const base = slugifyBase(input.name);
  const slugInput = input.slug?.trim() ? slugifyBase(input.slug) : null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const slug =
      slugInput ??
      `${base}-${randomBytes(4).toString("hex")}${attempt > 0 ? `-${attempt}` : ""}`;
    const token = generatePublicToken();
    const { data, error } = await supabase
      .from("landing_pages")
      .insert({
        name: input.name.trim(),
        slug,
        user_id: input.user_id,
        public_token: token,
        is_active: input.is_active ?? true,
      })
      .select("*")
      .single();

    if (!error && data) return data as LandingPage;
    if (error?.code === "23505") {
      continue;
    }
    throw error;
  }
  throw new Error("Could not create landing page");
}

export async function updateLandingPage(
  id: string,
  patch: Partial<Pick<LandingPage, "name" | "slug" | "user_id" | "is_active">>
): Promise<LandingPage> {
  const supabase = requireService();
  const next = { ...patch };
  if (patch.slug !== undefined) {
    next.slug = slugifyBase(patch.slug);
  }
  const { data, error } = await supabase
    .from("landing_pages")
    .update(next)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    if (error.code === "PGRST116") {
      const err = new Error("not found");
      (err as Error & { code: string }).code = "NOT_FOUND";
      throw err;
    }
    throw error;
  }
  return data as LandingPage;
}

export async function regeneratePublicToken(id: string): Promise<LandingPage> {
  const supabase = requireService();
  const token = generatePublicToken();
  const { data, error } = await supabase
    .from("landing_pages")
    .update({ public_token: token })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as LandingPage;
}

export async function getLandingPageById(id: string): Promise<LandingPage | null> {
  const supabase = requireService();
  const { data, error } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as LandingPage | null;
}
