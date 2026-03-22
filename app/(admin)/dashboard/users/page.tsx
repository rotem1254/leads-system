import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/server-context";
import { UsersView } from "@/components/users/users-view";

export default async function UsersPage() {
  const ctx = await getAuthContext();
  if (!ctx || ctx.profile.role !== "admin") {
    redirect("/dashboard");
  }
  return <UsersView />;
}
