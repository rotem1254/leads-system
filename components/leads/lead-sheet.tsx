"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/fetcher";
import type { Lead, LeadStatus } from "@/types/lead";
import type { UserRole } from "@/types/profile";
import { statusLabels } from "@/lib/lead-ui";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const statuses: LeadStatus[] = [
  "new",
  "in_progress",
  "closed",
  "irrelevant",
];

type Props = {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: UserRole | undefined;
};

export function LeadSheet({ lead, open, onOpenChange, role }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Lead>>({});
  const isAdmin = role === "admin";

  useEffect(() => {
    if (lead) setForm(lead);
  }, [lead]);

  async function save() {
    if (!lead) return;
    setSaving(true);
    try {
      if (isAdmin) {
        await apiFetch<{ success: boolean }>(`/api/leads/${lead.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            full_name: form.full_name,
            phone: form.phone,
            email:
              form.email === undefined || String(form.email).trim() === ""
                ? null
                : String(form.email).trim(),
            message:
              form.message === undefined || form.message === null
                ? null
                : String(form.message).trim() === ""
                  ? null
                  : String(form.message).trim(),
            page_source: form.page_source,
            status: form.status,
            notes:
              form.notes === undefined || form.notes === null
                ? null
                : String(form.notes).trim() === ""
                  ? null
                  : String(form.notes),
          }),
        });
      } else {
        await apiFetch<{ success: boolean }>(`/api/leads/${lead.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            full_name: form.full_name,
            phone: form.phone,
            email:
              form.email === undefined || String(form.email).trim() === ""
                ? null
                : String(form.email).trim(),
            message:
              form.message === undefined || form.message === null
                ? null
                : String(form.message).trim() === ""
                  ? null
                  : String(form.message).trim(),
            status: form.status,
            notes:
              form.notes === undefined || form.notes === null
                ? null
                : String(form.notes).trim() === ""
                  ? null
                  : String(form.notes),
          }),
        });
      }
      toast.success("נשמר");
      await qc.invalidateQueries({ queryKey: ["leads"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-start">
          <SheetTitle>פרטי ליד</SheetTitle>
          <SheetDescription className="text-start">
            עריכה ועדכון סטטוס · מזהה {lead.id.slice(0, 8)}…
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-1 flex-col gap-4">
          <div className="space-y-2">
            <Label>שם מלא</Label>
            <Input
              value={form.full_name ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, full_name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>טלפון</Label>
            <Input
              dir="ltr"
              className="text-left"
              value={form.phone ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>אימייל</Label>
            <Input
              dir="ltr"
              className="text-left"
              type="email"
              value={form.email ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value || null }))
              }
            />
          </div>
          {isAdmin && (
            <div className="space-y-2">
              <Label>מקור (page_source)</Label>
              <Input
                dir="ltr"
                className="text-left"
                value={form.page_source ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, page_source: e.target.value }))
                }
              />
            </div>
          )}
          {!isAdmin && (
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">מקור: </span>
              {lead.page_source}
            </div>
          )}
          <div className="space-y-2">
            <Label>הודעה</Label>
            <Textarea
              rows={3}
              value={form.message ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, message: e.target.value || null }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>סטטוס</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, status: v as LeadStatus }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>הערות פנימיות</Label>
            <Textarea
              rows={4}
              placeholder="הערות למנהלים בלבד"
              value={form.notes ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value || null }))
              }
            />
          </div>
          {lead.landing_page && (
            <p className="text-xs text-muted-foreground">
              דף נחיתה במערכת:{" "}
              <span className="font-medium text-foreground">
                {lead.landing_page.name}
              </span>
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            נוצר:{" "}
            {new Date(lead.created_at).toLocaleString("he-IL")} · עודכן:{" "}
            {new Date(lead.updated_at).toLocaleString("he-IL")}
          </p>
        </div>
        <div className="mt-auto flex gap-2 border-t pt-4">
          <Button className="flex-1" onClick={save} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="ms-2 size-4 animate-spin" />
                שומר…
              </>
            ) : (
              "שמירה"
            )}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            סגירה
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
