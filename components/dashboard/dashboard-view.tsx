"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "@/components/leads/status-badge";
import { apiFetch } from "@/lib/fetcher";
import { statusLabels } from "@/lib/lead-ui";
import type { DashboardStats, LeadStatus } from "@/types/lead";
import { ArrowLeft, Inbox } from "lucide-react";

type MeRes = {
  success: boolean;
  profile?: { role: "admin" | "client" };
};

type StatsRes = { success: boolean; data: DashboardStats };

export function DashboardView() {
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<MeRes>("/api/me"),
  });

  const isAdmin = me?.profile?.role === "admin";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiFetch<StatsRes>("/api/dashboard/stats"),
  });

  if (isLoading || !me) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || !data?.success) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>לא ניתן לטעון נתונים</CardTitle>
          <CardDescription>
            {(error as Error)?.message ||
              "ודאו ש-SUPABASE_SERVICE_ROLE_KEY מוגדר והטבלאות קיימות."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const stats = data.data;
  const statusOrder: LeadStatus[] = [
    "new",
    "in_progress",
    "closed",
    "irrelevant",
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">סקירה</h1>
        <p className="mt-1 text-muted-foreground">
          {isAdmin
            ? "תמונת מצב של כל הפלטפורמה"
            : "הלידים ודפי הנחיתה שלך במקום אחד"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-0 shadow-md shadow-zinc-200/60">
          <CardHeader className="pb-2">
            <CardDescription>סה״כ לידים</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        {statusOrder.map((s) => (
          <Card
            key={s}
            className="border-0 shadow-md shadow-zinc-200/60 transition hover:shadow-lg"
          >
            <CardHeader className="pb-2">
              <CardDescription>{statusLabels[s]}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {stats.byStatus[s]}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-0 shadow-md shadow-zinc-200/60">
            <CardHeader className="pb-2">
              <CardDescription>משתמשים רשומים</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {stats.totalUsers ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/users"
                className="text-sm font-medium text-primary hover:underline"
              >
                ניהול משתמשים
              </Link>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md shadow-zinc-200/60">
            <CardHeader className="pb-2">
              <CardDescription>דפי נחיתה</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {stats.totalLandingPages ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/landing-pages"
                className="text-sm font-medium text-primary hover:underline"
              >
                ניהול דפי נחיתה
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-md shadow-zinc-200/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>לידים אחרונים</CardTitle>
              <CardDescription>הגשות שהגיעו לאחרונה</CardDescription>
            </div>
            <Link
              href="/dashboard/leads"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              לכל הלידים
              <ArrowLeft className="size-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Inbox className="mb-2 size-10 opacity-40" />
                <p>אין לידים עדיין</p>
              </div>
            ) : (
              stats.recent.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{lead.full_name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {lead.landing_page?.name ?? lead.page_source} · {lead.phone}
                    </p>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md shadow-zinc-200/60">
          <CardHeader>
            <CardTitle>לפי מקור (page_source)</CardTitle>
            <CardDescription>מטא-דאטה מהטופס החיצוני</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.bySource.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                אין נתונים
              </p>
            ) : (
              stats.bySource.map((row) => (
                <div
                  key={row.page_source}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2"
                >
                  <span className="truncate font-medium">{row.page_source}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.count}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md shadow-zinc-200/60">
        <CardHeader>
          <CardTitle>לפי דף נחיתה במערכת</CardTitle>
          <CardDescription>
            לפי רשומת דף הנחיתה (landing page)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.byLandingPage.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              אין לידים מקושרים לדפי נחיתה
            </p>
          ) : (
            stats.byLandingPage.map((row) => (
              <div
                key={row.landing_page_id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2"
              >
                <span className="truncate font-medium">{row.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {row.count}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
