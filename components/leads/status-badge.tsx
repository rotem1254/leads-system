import { Badge } from "@/components/ui/badge";
import { statusBadgeClass, statusLabels } from "@/lib/lead-ui";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/types/lead";

type Props = {
  status: LeadStatus;
  className?: string;
};

/** Consistent status chip for tables, dashboard, and detail panels */
export function LeadStatusBadge({ status, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn(statusBadgeClass[status], className)}
    >
      {statusLabels[status]}
    </Badge>
  );
}
