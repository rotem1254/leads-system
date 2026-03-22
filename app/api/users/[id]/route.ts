import { NextResponse } from "next/server";
import { ensureSchemaNextResponse } from "@/lib/api/schema-guard";
import { nextResponseForServiceError } from "@/lib/api/service-error";
import { getAuthContext } from "@/lib/auth/server-context";
import { formatSupabaseErrorForLog } from "@/lib/supabase/errors";
import { updateUserAsAdmin } from "@/lib/users/service";
import { updateUserSchema } from "@/lib/validation/users";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await ensureSchemaNextResponse();
  if (blocked) return blocked;

  const auth = await getAuthContext();
  if (!auth || auth.profile.role !== "admin") {
    return NextResponse.json({ success: false, message: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "גוף לא תקין" }, { status: 400 });
  }
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "שגיאת ולידציה", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { password, ...rest } = parsed.data;
  const patch = { ...rest };
  if (password && password.length > 0) {
    Object.assign(patch, { password });
  }
  try {
    const row = await updateUserAsAdmin(id, patch);
    return NextResponse.json({ success: true, data: row });
  } catch (e) {
    const mapped = nextResponseForServiceError("[PATCH /api/users/:id]", e);
    if (mapped) return mapped;
    console.error("[PATCH /api/users/:id]", formatSupabaseErrorForLog(e));
    return NextResponse.json({ success: false, message: "שגיאת שרת" }, { status: 500 });
  }
}
