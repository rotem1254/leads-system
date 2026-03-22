import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _service: SupabaseClient | null = null;

/** Server-only: bypasses RLS. Use only after auth checks for admin routes. */
export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_service) {
    _service = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _service;
}
