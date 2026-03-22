import { NextResponse } from "next/server";
import { ensureSchemaNextResponse } from "@/lib/api/schema-guard";
import { nextResponseForServiceError } from "@/lib/api/service-error";
import { getAuthContext } from "@/lib/auth/server-context";
import { formatSupabaseErrorForLog } from "@/lib/supabase/errors";
import { createUserWithProfile, listUsersForAdmin } from "@/lib/users/service";
import { createUserSchema } from "@/lib/validation/users";

export async function GET() {
  const blocked = await ensureSchemaNextResponse();
  if (blocked) return blocked;

  const ctx = await getAuthContext();
  if (!ctx || ctx.profile.role !== "admin") {
    return NextResponse.json({ success: false, message: "אין הרשאה" }, { status: 403 });
  }
  try {
    const rows = await listUsersForAdmin();
    return NextResponse.json({ success: true, rows });
  } catch (e) {
    const mapped = nextResponseForServiceError("[GET /api/users]", e);
    if (mapped) return mapped;
    console.error("[GET /api/users]", formatSupabaseErrorForLog(e));
    return NextResponse.json({ success: false, message: "שגיאת שרת" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const blocked = await ensureSchemaNextResponse();
  if (blocked) return blocked;

  const ctx = await getAuthContext();
  if (!ctx || ctx.profile.role !== "admin") {
    return NextResponse.json({ success: false, message: "אין הרשאה" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "גוף לא תקין" }, { status: 400 });
  }
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "שגיאת ולידציה", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const row = await createUserWithProfile(parsed.data);
    return NextResponse.json({ success: true, data: row });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const mapped = nextResponseForServiceError("[POST /api/users]", e);
    if (mapped) return mapped;
    if (String(err.message).toLowerCase().includes("already registered")) {
      return NextResponse.json(
        { success: false, message: "המשתמש כבר קיים" },
        { status: 409 }
      );
    }
    console.error("[POST /api/users]", e);
    return NextResponse.json(
      { success: false, message: err.message ?? "שגיאת שרת" },
      { status: 500 }
    );
  }
}
