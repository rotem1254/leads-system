import { getServiceClient } from "@/lib/supabase/service";
import type { Profile, UserRole } from "@/types/profile";

function requireService() {
  const s = getServiceClient();
  if (!s) {
    const err = new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    (err as Error & { code: string }).code = "SERVICE_UNAVAILABLE";
    throw err;
  }
  return s;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = requireService();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(
  id: string,
  patch: Partial<Pick<Profile, "full_name" | "is_active" | "role">>
): Promise<Profile> {
  const supabase = requireService();
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
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
  return data as Profile;
}

export async function listProfilesForAdmin(): Promise<Profile[]> {
  const supabase = requireService();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function setProfileRole(id: string, role: UserRole): Promise<Profile> {
  return updateProfile(id, { role });
}
