import { getServiceClient } from "@/lib/supabase/service";
import type {
  Lead,
  LeadListParams,
  LeadStatus,
  DashboardStats,
} from "@/types/lead";
import type { CreateLeadPublicInput } from "@/lib/validation/leads";

type InsertPublicLeadInput = Omit<CreateLeadPublicInput, "landing_token"> & {
  landing_page_id: string;
  user_id: string;
};

function requireService() {
  const s = getServiceClient();
  if (!s) {
    const err = new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    (err as Error & { code: string }).code = "SERVICE_UNAVAILABLE";
    throw err;
  }
  return s;
}

type LeadRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  message: string | null;
  page_source: string;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  landing_page_id: string | null;
  user_id: string | null;
  landing_pages?: { id: string; name: string; slug: string } | null;
  profiles?: { full_name: string } | null;
};

function mapLeadRow(row: LeadRow): Lead {
  const lp = row.landing_pages;
  const owner = row.profiles;
  return {
    id: row.id,
    full_name: row.full_name,
    phone: row.phone,
    email: row.email,
    message: row.message,
    page_source: row.page_source,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    landing_page_id: row.landing_page_id,
    user_id: row.user_id,
    landing_page: lp
      ? { id: lp.id, name: lp.name, slug: lp.slug }
      : null,
    owner_name: owner?.full_name ?? null,
  };
}

export async function insertLeadFromPublic(
  input: InsertPublicLeadInput
): Promise<{ id: string }> {
  const supabase = requireService();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      full_name: input.full_name,
      phone: input.phone,
      email: input.email ?? null,
      message: input.message ?? null,
      page_source: input.page_source,
      status: "new" as LeadStatus,
      landing_page_id: input.landing_page_id,
      user_id: input.user_id,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function listLeads(params: LeadListParams): Promise<{
  rows: Lead[];
  total: number;
}> {
  const supabase = requireService();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let q = supabase
    .from("leads")
    .select(
      `
      *,
      landing_pages ( id, name, slug ),
      profiles!leads_user_id_fkey ( full_name )
    `,
      { count: "exact" }
    );

  if (params.scope?.role === "client") {
    q = q.eq("user_id", params.scope.userId);
  }

  if (params.status) {
    q = q.eq("status", params.status);
  }
  if (params.page_source) {
    q = q.eq("page_source", params.page_source);
  }
  if (params.user_id) {
    q = q.eq("user_id", params.user_id);
  }
  if (params.landing_page_id) {
    q = q.eq("landing_page_id", params.landing_page_id);
  }

  if (params.q?.trim()) {
    const term = params.q.trim().replace(/[%*,]/g, "").slice(0, 120);
    if (term) {
      const s = `%${term}%`;
      q = q.or(
        `full_name.ilike.${s},phone.ilike.${s},email.ilike.${s},message.ilike.${s}`
      );
    }
  }

  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return {
    rows: (data ?? []).map((r) => mapLeadRow(r as LeadRow)),
    total: count ?? 0,
  };
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const supabase = requireService();
  const { data, error } = await supabase
    .from("leads")
    .select(
      `
      *,
      landing_pages ( id, name, slug ),
      profiles!leads_user_id_fkey ( full_name )
    `
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapLeadRow(data as LeadRow);
}

export async function updateLead(
  id: string,
  patch: Partial<{
    full_name: string;
    phone: string;
    email: string | null;
    message: string | null;
    page_source: string;
    status: LeadStatus;
    notes: string | null;
  }>
): Promise<Lead> {
  const supabase = requireService();
  const { data, error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", id)
    .select(
      `
      *,
      landing_pages ( id, name, slug ),
      profiles!leads_user_id_fkey ( full_name )
    `
    )
    .single();
  if (error) {
    if (error.code === "PGRST116") {
      const err = new Error("not found");
      (err as Error & { code: string }).code = "NOT_FOUND";
      throw err;
    }
    throw error;
  }
  return mapLeadRow(data as LeadRow);
}

export async function deleteLead(id: string): Promise<void> {
  const supabase = requireService();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}

export async function getDashboardStats(
  scope?: { role: "admin" | "client"; userId: string }
): Promise<DashboardStats> {
  const supabase = requireService();

  const statuses: LeadStatus[] = [
    "new",
    "in_progress",
    "closed",
    "irrelevant",
  ];
  const byStatus = Object.fromEntries(
    statuses.map((s) => [s, 0])
  ) as Record<LeadStatus, number>;

  const base = () => {
    let q = supabase.from("leads").select("*", { count: "exact", head: true });
    if (scope?.role === "client") {
      q = q.eq("user_id", scope.userId);
    }
    return q;
  };

  const { count: total, error: totalErr } = await base();
  if (totalErr) throw totalErr;

  for (const st of statuses) {
    let q = supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", st);
    if (scope?.role === "client") {
      q = q.eq("user_id", scope.userId);
    }
    const { count, error } = await q;
    if (error) throw error;
    byStatus[st] = count ?? 0;
  }

  let sourceQ = supabase.from("leads").select("page_source");
  if (scope?.role === "client") {
    sourceQ = sourceQ.eq("user_id", scope.userId);
  }
  const { data: sourceRows } = await sourceQ;
  const map = new Map<string, number>();
  for (const row of sourceRows ?? []) {
    const ps = (row as { page_source: string }).page_source;
    map.set(ps, (map.get(ps) ?? 0) + 1);
  }
  const bySource = [...map.entries()]
    .map(([page_source, count]) => ({ page_source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  let lpIdsQ = supabase.from("leads").select("landing_page_id");
  if (scope?.role === "client") {
    lpIdsQ = lpIdsQ.eq("user_id", scope.userId);
  }
  const { data: lpIdRows, error: lpErr } = await lpIdsQ;
  if (lpErr) throw lpErr;
  const lpCounts = new Map<string, number>();
  for (const row of lpIdRows ?? []) {
    const lid = (row as { landing_page_id: string | null }).landing_page_id;
    if (!lid) continue;
    lpCounts.set(lid, (lpCounts.get(lid) ?? 0) + 1);
  }
  const lpIds = [...lpCounts.keys()];
  const namesById = new Map<string, string>();
  if (lpIds.length > 0) {
    const { data: lpMeta, error: lmErr } = await supabase
      .from("landing_pages")
      .select("id, name")
      .in("id", lpIds);
    if (lmErr) throw lmErr;
    for (const r of lpMeta ?? []) {
      const row = r as { id: string; name: string };
      namesById.set(row.id, row.name);
    }
  }
  const byLandingPage = [...lpCounts.entries()]
    .map(([landing_page_id, count]) => ({
      landing_page_id,
      name: namesById.get(landing_page_id) ?? "—",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  let recentQ = supabase
    .from("leads")
    .select(
      `
      *,
      landing_pages ( id, name, slug ),
      profiles!leads_user_id_fkey ( full_name )
    `
    )
    .order("created_at", { ascending: false })
    .limit(8);
  if (scope?.role === "client") {
    recentQ = recentQ.eq("user_id", scope.userId);
  }
  const { data: recent, error: recErr } = await recentQ;
  if (recErr) throw recErr;

  const out: DashboardStats = {
    total: total ?? 0,
    byStatus,
    bySource,
    byLandingPage,
    recent: (recent ?? []).map((r) => mapLeadRow(r as LeadRow)),
  };

  if (!scope || scope.role === "admin") {
    const { count: nu } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    const { count: nl } = await supabase
      .from("landing_pages")
      .select("*", { count: "exact", head: true });
    out.totalUsers = nu ?? 0;
    out.totalLandingPages = nl ?? 0;
  }

  return out;
}
