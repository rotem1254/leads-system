import { NextResponse } from "next/server";
import { ensureSchemaNextResponse } from "@/lib/api/schema-guard";
import { nextResponseForServiceError } from "@/lib/api/service-error";
import { getAuthContext } from "@/lib/auth/server-context";
import { createLandingPage, listLandingPagesScoped } from "@/lib/landing-pages/service";
import { formatSupabaseErrorForLog } from "@/lib/supabase/errors";
import { createLandingPageSchema } from "@/lib/validation/landing-pages";

export async function GET() {
  const blocked = await ensureSchemaNextResponse();
  if (blocked) return blocked;

  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ success: false, message: "לא מורשה" }, { status: 401 });
  }
  try {
    const rows = await listLandingPagesScoped({
      role: ctx.profile.role === "admin" ? "admin" : "client",
      userId: ctx.user.id,
    });
    return NextResponse.json({ success: true, rows });
  } catch (e) {
    const mapped = nextResponseForServiceError("[GET /api/landing-pages]", e);
    if (mapped) return mapped;
    console.error("[GET /api/landing-pages]", formatSupabaseErrorForLog(e));
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
  const parsed = createLandingPageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "שגיאת ולידציה", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const row = await createLandingPage(parsed.data);
    return NextResponse.json({ success: true, data: row });
  } catch (e) {
    const mapped = nextResponseForServiceError("[POST /api/landing-pages]", e);
    if (mapped) return mapped;
    console.error("[POST /api/landing-pages]", formatSupabaseErrorForLog(e));
    return NextResponse.json({ success: false, message: "שגיאת שרת" }, { status: 500 });
  }
}
