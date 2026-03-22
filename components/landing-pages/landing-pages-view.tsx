"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { apiFetch } from "@/lib/fetcher";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Copy, RefreshCw } from "lucide-react";
import type { LandingPageWithOwner } from "@/types/landing-page";

type MeRes = {
  success: boolean;
  profile?: { role: "admin" | "client" };
};

type UsersRes = {
  success: boolean;
  rows: { id: string; full_name: string; email: string | null }[];
};

type LpListRes = { success: boolean; rows: LandingPageWithOwner[] };

function apiOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function LandingPagesView() {
  const qc = useQueryClient();
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<MeRes>("/api/me"),
  });
  const isAdmin = me?.profile?.role === "admin";

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<UsersRes>("/api/users"),
    enabled: isAdmin === true,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["landing-pages"],
    queryFn: () => apiFetch<LpListRes>("/api/landing-pages"),
  });

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    user_id: "",
  });

  const [detail, setDetail] = useState<LandingPageWithOwner | null>(null);

  const userOptions = useMemo(
    () =>
      (usersData?.rows ?? []).filter((u) => u.id).map((u) => ({
        id: u.id,
        label: `${u.full_name || u.email || u.id.slice(0, 8)}`,
      })),
    [usersData]
  );

  async function createLp(e: React.FormEvent) {
    e.preventDefault();
    if (!form.user_id) {
      toast.error("בחרו לקוח (בעלים)");
      return;
    }
    setCreating(true);
    try {
      await apiFetch("/api/landing-pages", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          slug: form.slug.trim() || undefined,
          user_id: form.user_id,
        }),
      });
      toast.success("דף הנחיתה נוצר");
      setForm({ name: "", slug: "", user_id: "" });
      await qc.invalidateQueries({ queryKey: ["landing-pages"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("הועתק");
    } catch {
      toast.error("העתקה נכשלה");
    }
  }

  async function toggleActive(lp: LandingPageWithOwner) {
    try {
      await apiFetch(`/api/landing-pages/${lp.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !lp.is_active }),
      });
      toast.success("עודכן");
      await refetch();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function regenerate(lp: LandingPageWithOwner) {
    if (!confirm("ליצור מחדש את הטוקן? טפסים קיימים יצטרכו עדכון.")) return;
    try {
      await apiFetch(`/api/landing-pages/${lp.id}`, {
        method: "PATCH",
        body: JSON.stringify({ regenerate_token: true }),
      });
      toast.success("טוקן חדש נוצר");
      await refetch();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const endpoint = `${apiOrigin()}/api/leads`;
  const examplePayload = (token: string) =>
    JSON.stringify(
      {
        full_name: "ישראל ישראלי",
        phone: "0501234567",
        email: "test@example.com",
        message: "אני מעוניין בפרטים",
        page_source: "my-landing",
        landing_token: token,
      },
      null,
      2
    );

  const htmlSnippet = (token: string) =>
    `<form id="lead-form">\n  <!-- ... שדות ... -->\n</form>\n<script>\n  document.getElementById('lead-form').addEventListener('submit', async (e) => {\n    e.preventDefault();\n    const res = await fetch('${endpoint}', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({\n        full_name: '...',\n        phone: '...',\n        email: '...',\n        message: '...',\n        page_source: 'my-site',\n        landing_token: '${token}'\n      })\n    });\n    const data = await res.json();\n    console.log(data);\n  });\n</script>`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isAdmin ? "דפי נחיתה" : "דפי הנחיתה שלי"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isAdmin
            ? "ניהול דפים, שיוך ללקוחות וטוקנים לחיבור טפסים"
            : "הטוקן שלך לשליחת לידים למערכת"}
        </p>
      </div>

      {isAdmin && (
        <Card className="border-0 shadow-md shadow-zinc-200/60">
          <CardHeader>
            <CardTitle>דף נחיתה חדש</CardTitle>
            <CardDescription>שם תצוגה, מזהה URL (אופציונלי) ובעלים</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createLp} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="lp-name">שם</Label>
                <Input
                  id="lp-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lp-slug">מזהה (slug) — אופציונלי</Label>
                <Input
                  id="lp-slug"
                  dir="ltr"
                  className="text-left"
                  placeholder="auto"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>בעלים (לקוח)</Label>
                <Select
                  value={form.user_id}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, user_id: v ?? "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחרו משתמש" />
                  </SelectTrigger>
                  <SelectContent>
                    {userOptions.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="ms-2 size-4 animate-spin" />
                      יוצר…
                    </>
                  ) : (
                    "יצירה"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-md shadow-zinc-200/60">
        <CardHeader>
          <CardTitle>רשימה</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם</TableHead>
                    {isAdmin && <TableHead>בעלים</TableHead>}
                    <TableHead>סטטוס</TableHead>
                    <TableHead className="min-w-[200px]">טוקן</TableHead>
                    <TableHead className="w-[200px]">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.rows ?? []).map((lp) => (
                    <TableRow key={lp.id}>
                      <TableCell className="font-medium">{lp.name}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-sm text-muted-foreground">
                          {lp.owner_name ?? lp.owner_email ?? "—"}
                        </TableCell>
                      )}
                      <TableCell>
                        {lp.is_active ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-800"
                          >
                            פעיל
                          </Badge>
                        ) : (
                          <Badge variant="outline">כבוי</Badge>
                        )}
                      </TableCell>
                      <TableCell dir="ltr" className="font-mono text-xs">
                        {lp.public_token}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyText(lp.public_token)}
                          >
                            <Copy className="ms-1 size-3.5" />
                            טוקן
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setDetail(lp)}
                          >
                            אינטגרציה
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleActive(lp)}
                          >
                            {lp.is_active ? "כבה" : "הפעל"}
                          </Button>
                          {isAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              title="טוקן חדש"
                              onClick={() => regenerate(lp)}
                            >
                              <RefreshCw className="size-4" />
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

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader className="text-start">
            <SheetTitle>חיבור טופס — {detail?.name}</SheetTitle>
            <SheetDescription className="text-start">
              העתיקו את כתובת ה-API, הטוקן ודוגמת ה-JSON לדף הנחיתה שלכם.
            </SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-6 space-y-4 text-start">
              <div>
                <Label className="text-muted-foreground">Endpoint</Label>
                <div className="mt-1 flex gap-2">
                  <Input readOnly dir="ltr" className="font-mono text-xs" value={endpoint} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyText(endpoint)}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">landing_token</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    readOnly
                    dir="ltr"
                    className="font-mono text-xs"
                    value={detail.public_token}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyText(detail.public_token)}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">דוגמת JSON</Label>
                <pre className="mt-1 max-h-48 overflow-auto rounded-lg border bg-zinc-950 p-3 text-xs text-zinc-100" dir="ltr">
                  {examplePayload(detail.public_token)}
                </pre>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => copyText(examplePayload(detail.public_token))}
                >
                  העתק JSON
                </Button>
              </div>
              <div>
                <Label className="text-muted-foreground">דוגמת HTML/JS</Label>
                <pre className="mt-1 max-h-56 overflow-auto rounded-lg border bg-zinc-50 p-3 text-xs" dir="ltr">
                  {htmlSnippet(detail.public_token)}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
