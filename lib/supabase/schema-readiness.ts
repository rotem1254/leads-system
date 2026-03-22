import "server-only";

import {
  formatSupabaseErrorForLog,
  isSchemaCacheMissingError,
  isUndefinedColumnError,
} from "@/lib/supabase/errors";
import { getServiceClient } from "@/lib/supabase/service";

export type SchemaReadiness =
  | { ok: true }
  | { ok: false; code: string; message: string };

let cached: { value: SchemaReadiness; expires: number } | null = null;
const TTL_MS = 60_000;

/** Clear cache after migrations (optional; TTL also expires). */
export function clearSchemaReadinessCache(): void {
  cached = null;
}

function mapProbeError(e: unknown): SchemaReadiness {
  if (isSchemaCacheMissingError(e)) {
    return {
      ok: false,
      code: "PGRST205",
      message:
        "Missing tables — run supabase/migrations/001_leads.sql then 002_platform_multiclient.sql in Supabase SQL Editor.",
    };
  }
  if (isUndefinedColumnError(e)) {
    return {
      ok: false,
      code: "SCHEMA_MISMATCH",
      message:
        "Missing columns on public.leads — finish 002_platform_multiclient.sql (landing_page_id, user_id).",
    };
  }
  const ex = e as { code?: string; message?: string };
  return {
    ok: false,
    code: ex.code ?? "DB_PROBE_FAILED",
    message: ex.message ?? formatSupabaseErrorForLog(e),
  };
}

/**
 * Verifies landing_pages, profiles, and leads (with ownership columns) are usable.
 * Cached ~60s to avoid extra round-trips on every request.
 */
export async function getSchemaReadiness(): Promise<SchemaReadiness> {
  if (cached && Date.now() < cached.expires) {
    return cached.value;
  }

  const svc = getServiceClient();
  if (!svc) {
    const value: SchemaReadiness = {
      ok: false,
      code: "NO_SERVICE",
      message:
        "Server is missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL.",
    };
    cached = { value, expires: Date.now() + TTL_MS };
    return value;
  }

  const { error: lpErr } = await svc
    .from("landing_pages")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (lpErr) {
    const value = mapProbeError(lpErr);
    cached = { value, expires: Date.now() + TTL_MS };
    return value;
  }

  const { error: profErr } = await svc
    .from("profiles")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (profErr) {
    const value = mapProbeError(profErr);
    cached = { value, expires: Date.now() + TTL_MS };
    return value;
  }

  const { error: leadsErr } = await svc
    .from("leads")
    .select("id, landing_page_id, user_id")
    .limit(1)
    .maybeSingle();
  if (leadsErr) {
    const value = mapProbeError(leadsErr);
    cached = { value, expires: Date.now() + TTL_MS };
    return value;
  }

  const value: SchemaReadiness = { ok: true };
  cached = { value, expires: Date.now() + TTL_MS };
  return value;
}
