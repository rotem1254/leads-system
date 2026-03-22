"use client";

import { useState } from "react";
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
import { apiFetch } from "@/lib/fetcher";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { UserRole } from "@/types/profile";

type Row = {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  email: string | null;
};

type ListRes = { success: boolean; rows: Row[] };

export function UsersView() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "client" as UserRole,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<ListRes>("/api/users"),
  });

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("המשתמש נוצר");
      setForm({ email: "", password: "", full_name: "", role: "client" });
      await qc.invalidateQueries({ queryKey: ["users"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(u: Row) {
    try {
      await apiFetch(`/api/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      toast.success("עודכן");
      await refetch();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">משתמשים</h1>
        <p className="mt-1 text-muted-foreground">
          יצירת לקוחות והפעלה/השבתה — מבוסס Supabase Auth
        </p>
      </div>

      <Card className="border-0 shadow-md shadow-zinc-200/60">
        <CardHeader>
          <CardTitle>משתמש חדש</CardTitle>
          <CardDescription>אימייל וסיסמה לכניסה ללוח הבקרה</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUser} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                className="text-left"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">שם מלא</Label>
              <Input
                id="full_name"
                required
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>תפקיד</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">לקוח</SelectItem>
                  <SelectItem value="admin">מנהל</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creating} className="w-full sm:w-auto">
                {creating ? (
                  <>
                    <Loader2 className="ms-2 size-4 animate-spin" />
                    יוצר…
                  </>
                ) : (
                  "יצירת משתמש"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md shadow-zinc-200/60">
        <CardHeader>
          <CardTitle>רשימת משתמשים</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם</TableHead>
                    <TableHead>אימייל</TableHead>
                    <TableHead>תפקיד</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead className="w-[120px]">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.rows ?? []).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell dir="ltr" className="text-start text-sm">
                        {u.email ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role === "admin" ? "מנהל" : "לקוח"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.is_active ? (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                            פעיל
                          </Badge>
                        ) : (
                          <Badge variant="outline">מושבת</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(u)}
                        >
                          {u.is_active ? "השבתה" : "הפעלה"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
