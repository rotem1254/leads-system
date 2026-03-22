import { redirect } from "next/navigation";

/** @deprecated Use `/dashboard/leads` — kept for bookmarks */
export default function LeadsLegacyRedirect() {
  redirect("/dashboard/leads");
}
