import type { LeadStatus } from "@/types/lead";

export const statusLabels: Record<LeadStatus, string> = {
  new: "חדש",
  in_progress: "בטיפול",
  closed: "נסגר",
  irrelevant: "לא רלוונטי",
};

export const statusBadgeClass: Record<LeadStatus, string> = {
  new: "bg-sky-100 text-sky-900 border-sky-200",
  in_progress: "bg-amber-100 text-amber-950 border-amber-200",
  closed: "bg-emerald-100 text-emerald-950 border-emerald-200",
  irrelevant: "bg-zinc-200 text-zinc-700 border-zinc-300",
};
