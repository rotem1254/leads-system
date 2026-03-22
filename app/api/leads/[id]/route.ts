import { NextRequest, NextResponse } from "next/server";
import { ensureSchemaNextResponse } from "@/lib/api/schema-guard";
import { nextResponseForServiceError } from "@/lib/api/service-error";
import { getAuthContext } from "@/lib/auth/server-context";
import { deleteLead, getLeadById, updateLead } from "@/lib/leads/service";
import { formatSupabaseErrorForLog } from "@/lib/supabase/errors";
import {
  updateLeadAdminSchema,
  updateLeadClientSchema,
} from "@/lib/validation/leads";

type Ctx = { params: Promise<{ id: string }> };

function canAccessLead(
  lead: { user_id: string | null },
  ctx: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>
) {
  if (ctx.profile.role === "admin") return true;
  return lead.user_id === ctx.user.id;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const blocked = await ensureSchemaNextResponse();
  if (blocked) return blocked;

  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, message: "לא מורשה" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const row = await getLeadById(id);
    if (!row) {
      return NextResponse.json({ success: false, message: "לא נמצא" }, { status: 404 });
    }
    if (!canAccessLead(row, auth)) {
      return NextResponse.json({ success: false, message: "אין הרשאה" }, { status: 403 });
    }
    return NextResponse.json({ success: true, data: row });
  } catch (e) {
    const mapped = nextResponseForServiceError("[GET /api/leads/:id]", e);
    if (mapped) return mapped;
    console.error("[GET /api/leads/:id]", formatSupabaseErrorForLog(e));
    return NextResponse.json({ success: false, message: "שגיאת שרת" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const blocked = await ensureSchemaNextResponse();
  if (blocked) return blocked;

  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, message: "לא מורשה" }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "גוף הבקשה אינו JSON תקין" },
      { status: 400 }
    );
  }

  try {
    const existing = await getLeadById(id);
    if (!existing) {
      return NextResponse.json({ success: false, message: "לא נמצא" }, { status: 404 });
    }
    if (!canAccessLead(existing, auth)) {
      return NextResponse.json({ success: false, message: "אין הרשאה" }, { status: 403 });
    }

    if (auth.profile.role === "admin") {
      const parsed = updateLeadAdminSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            message: "שגיאת ולידציה",
            errors: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }
      const row = await updateLead(id, parsed.data);
      return NextResponse.json({
        success: true,
        message: "עודכן בהצלחה",
        data: row,
      });
    }

    const parsed = updateLeadClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "שגיאת ולידציה",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }
    const row = await updateLead(id, parsed.data);
    return NextResponse.json({
      success: true,
      message: "עודכן בהצלחה",
      data: row,
    });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const mapped = nextResponseForServiceError("[PATCH /api/leads/:id]", e);
    if (mapped) return mapped;
    if (err.code === "NOT_FOUND" || err.code === "PGRST116") {
      return NextResponse.json({ success: false, message: "לא נמצא" }, { status: 404 });
    }
    console.error("[PATCH /api/leads/:id]", formatSupabaseErrorForLog(e));
    return NextResponse.json({ success: false, message: "שגיאת שרת" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const blocked = await ensureSchemaNextResponse();
  if (blocked) return blocked;

  const auth = await getAuthContext();
  if (!auth || auth.profile.role !== "admin") {
    return NextResponse.json({ success: false, message: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    const existing = await getLeadById(id);
    if (!existing) {
      return NextResponse.json({ success: false, message: "לא נמצא" }, { status: 404 });
    }
    await deleteLead(id);
    return NextResponse.json({ success: true, message: "נמחק" });
  } catch (e) {
    const mapped = nextResponseForServiceError("[DELETE /api/leads/:id]", e);
    if (mapped) return mapped;
    console.error("[DELETE /api/leads/:id]", formatSupabaseErrorForLog(e));
    return NextResponse.json({ success: false, message: "שגיאת שרת" }, { status: 500 });
  }
}
