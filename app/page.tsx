import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/server-context";
import { getSchemaReadiness } from "@/lib/supabase/schema-readiness";

export default async function Home() {
  const ready = await getSchemaReadiness();
  if (!ready.ok) {
    redirect("/dashboard");
  }

  const ctx = await getAuthContext();
  if (ctx) redirect("/dashboard");
  redirect("/login");
}
