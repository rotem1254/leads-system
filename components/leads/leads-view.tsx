"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiFetch } from "@/lib/fetcher";
import { LeadStatusBadge } from "@/components/leads/status-badge";
import { statusLabels } from "@/lib/lead-ui";
import type { Lead, LeadStatus } from "@/types/lead";
import { LeadSheet } from "@/components/leads/lead-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/types/profile";
import type { LandingPageWithOwner } from "@/types/landing-page";

type ListRes = {
  success: boolean;
  rows: Lead[];
  total: number;
  page: number;
  limit: number;
};

type MeRes = {
  success: boolean;
  profile?: { role: UserRole };
};

type UsersRes = {
  success: boolean;
  rows: { id: string; full_name: string; email: string | null }[];
};

type LpRes = { success: boolean; rows: LandingPageWithOwner[] };

const allStatuses: (LeadStatus | "all")[] = [
  "all",
  "new",
  "in_progress",
  "closed",
  "irrelevant",
];

export function LeadsView() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [source, setSource] = useState<string>("all");
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [filterLpId, setFilterLpId] = useState<string>("all");
  const [sheetLead, setSheetLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<MeRes>("/api/me"),
  });
  const role = meData?.profile?.role;
  const isAdmin = role === "admin";

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const { data: statsData } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiFetch<{ success: boolean; data: { bySource: { page_source: string }[] } }>(
      "/api/dashboard/stats"
    ),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<UsersRes>("/api/users"),
    enabled: isAdmin === true,
  });

  const { data: lpData } = useQuery({
    queryKey: ["landing-pages"],
    queryFn: () => apiFetch<LpRes>("/api/landing-pages"),
    enabled: isAdmin === true,
  });

  const sources = useMemo(() => {
    const rows = statsData?.data?.bySource ?? [];
    return rows.map((r) => r.page_source);
  }, [statsData]);

  const limit = 15;
  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", String(limit));
    if (q.trim()) p.set("q", q.trim());
    if (status !== "all") p.set("status", status);
    if (source !== "all") p.set("page_source", source);
    if (isAdmin && filterUserId !== "all") p.set("user_id", filterUserId);
    if (filterLpId !== "all") p.set("landing_page_id", filterLpId);
    return p.toString();
  }, [page, q, status, source, filterUserId, filterLpId, isAdmin]);

  const { data: listRes, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["leads", queryString],
    queryFn: () => apiFetch<ListRes>(`/api/leads?${queryString}`),
    enabled: role !== undefined,
  });

  useEffect(() => {
    setPage(1);
  }, [q, status, source, filterUserId, filterLpId]);

  async function confirmDelete() {
    if (!deleteLead) return;
    try {
      await apiFetch(`/api/leads/${deleteLead.id}`, { method: "DELETE" });
      toast.success("הליד נמחק");
      setDeleteLead(null);
      await qc.invalidateQueries({ queryKey: ["leads"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function openView(lead: Lead) {
    setSheetLead(lead);
    setSheetOpen(true);
  }

  const totalPages = listRes?.total
    ? Math.max(1, Math.ceil(listRes.total / limit))
    : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ניהול לידים</h1>
        <p className="mt-1 text-muted-foreground">
          {isAdmin
            ? "כל הלידים בפלטפורמה — חיפוש, סינון ועריכה"
            : "הלידים מדפי הנחיתה שלך בלבד"}
        </p>
      </div>

      <Card className="border-0 shadow-md shadow-zinc-200/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">סינון</CardTitle>
          <CardDescription>חיפוש בשם, טלפון, אימייל או הודעה</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="חיפוש…"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              className="pe-10"
            />
          </div>
          <div className="w-full min-w-[160px] md:w-48">
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              סטטוס
            </label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as LeadStatus | "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                {allStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "הכל" : statusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full min-w-[160px] md:w-56">
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              מקור (page_source)
            </label>
            <Select value={source} onValueChange={(v) => setSource(v ?? "all")}>
              <SelectTrigger>
                <SelectValue placeholder="מקור" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המקורות</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <>
              <div className="w-full min-w-[180px] md:w-56">
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  לקוח (בעלים)
                </label>
                <Select
                  value={filterUserId}
                  onValueChange={(v) => setFilterUserId(v ?? "all")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הלקוחות</SelectItem>
                    {(usersData?.rows ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email || u.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full min-w-[180px] md:w-56">
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  דף נחיתה
                </label>
                <Select
                  value={filterLpId}
                  onValueChange={(v) => setFilterLpId(v ?? "all")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="דף נחיתה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הדפים</SelectItem>
                    {(lpData?.rows ?? []).map((lp) => (
                      <SelectItem key={lp.id} value={lp.id}>
                        {lp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md shadow-zinc-200/60">
        <CardContent className="p-0">
          {isLoading || !role ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-destructive">
              {(error as Error).message}
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                נסה שוב
              </Button>
            </div>
          ) : !listRes?.rows?.length ? (
            <div className="p-12 text-center text-muted-foreground">
              לא נמצאו לידים
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">שם מלא</TableHead>
                    <TableHead className="text-start">טלפון</TableHead>
                    <TableHead className="text-start">אימייל</TableHead>
                    {isAdmin && (
                      <TableHead className="text-start">לקוח</TableHead>
                    )}
                    <TableHead className="text-start">דף נחיתה</TableHead>
                    <TableHead className="text-start">מקור</TableHead>
                    <TableHead className="text-start">סטטוס</TableHead>
                    <TableHead className="text-start">תאריך יצירה</TableHead>
                    <TableHead className="w-[140px] text-start">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listRes.rows.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() => openView(lead)}
                    >
                      <TableCell className="font-medium">{lead.full_name}</TableCell>
                      <TableCell dir="ltr" className="text-start">
                        {lead.phone}
                      </TableCell>
                      <TableCell dir="ltr" className="text-start text-muted-foreground">
                        {lead.email ?? "—"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="max-w-[120px] truncate text-sm">
                          {lead.owner_name ?? "—"}
                        </TableCell>
                      )}
                      <TableCell className="max-w-[140px] truncate text-sm">
                        {lead.landing_page?.name ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-sm">
                        {lead.page_source}
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(lead.created_at).toLocaleString("he-IL")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="צפייה"
                            onClick={() => openView(lead)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="עריכה"
                            onClick={() => openView(lead)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              title="מחיקה"
                              onClick={() => setDeleteLead(lead)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {listRes && listRes.total > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            מציג {(page - 1) * limit + 1}–
            {Math.min(page * limit, listRes.total)} מתוך {listRes.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              הקודם
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              הבא
            </Button>
          </div>
        </div>
      )}

      <LeadSheet
        lead={sheetLead}
        open={sheetOpen}
        role={role}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setSheetLead(null);
        }}
      />

      <AlertDialog
        open={!!deleteLead}
        onOpenChange={(open) => {
          if (!open) setDeleteLead(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק ליד?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו אינה הפיכה. הליד של {deleteLead?.full_name} יימחק לצמיתות.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
