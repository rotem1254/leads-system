import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/service";
import { listProfilesForAdmin, updateProfile } from "@/lib/profiles/service";
import type { Profile, UserRole } from "@/types/profile";

function requireService(): SupabaseClient {
  const s = getServiceClient();
  if (!s) {
    const err = new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    (err as Error & { code: string }).code = "SERVICE_UNAVAILABLE";
    throw err;
  }
  return s;
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

export type AdminUserRow = Profile & { email: string | null };

export async function listUsersForAdmin(): Promise<AdminUserRow[]> {
  const supabase = requireService();
  const profiles = await listProfilesForAdmin();
  const emails = await authEmailMap(supabase);
  return profiles.map((p) => ({
    ...p,
    email: emails.get(p.id) ?? null,
  }));
}

export async function createUserWithProfile(input: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}): Promise<AdminUserRow> {
  const supabase = requireService();
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
  });
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) {
    const err = new Error("User create failed");
    (err as Error & { code: string }).code = "AUTH_CREATE_FAILED";
    throw err;
  }

  const { data: prof, error: pe } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name.trim(),
      role: input.role,
    })
    .eq("id", uid)
    .select("*")
    .single();

  if (pe) throw pe;
  return {
    ...(prof as Profile),
    email: data.user?.email ?? input.email.trim(),
  };
}

export async function updateUserAsAdmin(
  id: string,
  patch: Partial<{ full_name: string; is_active: boolean; role: UserRole; password: string }>
): Promise<AdminUserRow> {
  const supabase = requireService();

  if (patch.password !== undefined && patch.password.length > 0) {
    const { error } = await supabase.auth.admin.updateUserById(id, {
      password: patch.password,
    });
    if (error) throw error;
  }

  const { full_name, is_active, role } = patch;
  const profilePatch: Partial<Profile> = {};
  if (full_name !== undefined) profilePatch.full_name = full_name;
  if (is_active !== undefined) profilePatch.is_active = is_active;
  if (role !== undefined) profilePatch.role = role;

  let profile: Profile;
  if (Object.keys(profilePatch).length > 0) {
    profile = await updateProfile(id, profilePatch);
  } else {
    const p = await supabase.from("profiles").select("*").eq("id", id).single();
    if (p.error) throw p.error;
    profile = p.data as Profile;
  }

  const { data: u } = await supabase.auth.admin.getUserById(id);
  return {
    ...profile,
    email: u.user?.email ?? null,
  };
}
