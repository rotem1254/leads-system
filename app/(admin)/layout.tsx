import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/server-context";
import { AdminShell } from "@/components/layout/admin-shell";
import { SchemaNotReady } from "@/components/layout/schema-not-ready";
import { getSchemaReadiness } from "@/lib/supabase/schema-readiness";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ready = await getSchemaReadiness();
  if (!ready.ok) {
    return <SchemaNotReady code={ready.code} message={ready.message} />;
  }

  const ctx = await getAuthContext();
  if (!ctx) {
    redirect("/login");
  }
  return <AdminShell role={ctx.profile.role}>{children}</AdminShell>;
}
