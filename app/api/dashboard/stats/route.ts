import { NextResponse } from "next/server";
import { ensureSchemaNextResponse } from "@/lib/api/schema-guard";
import { nextResponseForServiceError } from "@/lib/api/service-error";
import { getAuthContext } from "@/lib/auth/server-context";
import { getDashboardStats } from "@/lib/leads/service";
import { formatSupabaseErrorForLog } from "@/lib/supabase/errors";

export async function GET() {
  const blocked = await ensureSchemaNextResponse();
  if (blocked) return blocked;

  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ success: false, message: "לא מורשה" }, { status: 401 });
  }
  try {
    const scope =
      ctx.profile.role === "admin"
        ? undefined
        : { role: "client" as const, userId: ctx.user.id };
    const data = await getDashboardStats(scope);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const mapped = nextResponseForServiceError("[GET /api/dashboard/stats]", e);
    if (mapped) return mapped;
    console.error("[GET /api/dashboard/stats]", formatSupabaseErrorForLog(e));
    return NextResponse.json({ success: false, message: "שגיאת שרת" }, { status: 500 });
  }
}
