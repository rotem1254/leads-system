import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import type { Profile } from "@/types/profile";

export type AuthContext = {
  user: { id: string; email: string | undefined };
  profile: Profile;
};

/**
 * Session user + profile from DB (service role).
 * Returns null if unauthenticated, missing profile, or inactive user.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return null;

  const svc = getServiceClient();
  if (!svc) return null;

  const { data: profile, error } = await svc
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) return null;
  const p = profile as Profile;
  if (!p.is_active) return null;

  return {
    user: { id: user.id, email: user.email ?? undefined },
    profile: p,
  };
}
