import { NextResponse } from "next/server";
import { ensureSchemaNextResponse } from "@/lib/api/schema-guard";
import { nextResponseForServiceError } from "@/lib/api/service-error";
import { getAuthContext } from "@/lib/auth/server-context";
import {
  getLandingPageById,
  regeneratePublicToken,
  updateLandingPage,
} from "@/lib/landing-pages/service";
import { formatSupabaseErrorForLog } from "@/lib/supabase/errors";
import { updateLandingPageSchema } from "@/lib/validation/landing-pages";

type Ctx = { params: Promise<{ id: string }> };

async function canAccessLandingPage(
  ctx: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>,
  lpUserId: string
) {
  if (ctx.profile.role === "admin") return true;
  return ctx.user.id === lpUserId;
}

export async function GET(_req: Request, ctx: Ctx) {
  const blocked = await ensureSchemaNextResponse();
  if (blocked) return blocked;

  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ success: false, message: "לא מורשה" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const row = await getLandingPageById(id);
    if (!row) {
      return NextResponse.json({ success: false, message: "לא נמצא" }, { status: 404 });
    }
    if (!(await canAccessLandingPage(auth, row.user_id))) {
      return NextResponse.json({ success: false, message: "אין הרשאה" }, { status: 403 });
    }
    return NextResponse.json({ success: true, data: row });
  } catch (e) {
    const mapped = nextResponseForServiceError("[GET /api/landing-pages/:id]", e);
    if (mapped) return mapped;
    console.error("[GET /api/landing-pages/:id]", formatSupabaseErrorForLog(e));
    return NextResponse.json({ success: false, message: "שגיאת שרת" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
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
    return NextResponse.json({ success: false, message: "גוף לא תקין" }, { status: 400 });
  }
  const parsed = updateLandingPageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "שגיאת ולידציה", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const existing = await getLandingPageById(id);
    if (!existing) {
      return NextResponse.json({ success: false, message: "לא נמצא" }, { status: 404 });
    }
    if (!(await canAccessLandingPage(auth, existing.user_id))) {
      return NextResponse.json({ success: false, message: "אין הרשאה" }, { status: 403 });
    }

    const { regenerate_token, ...rest } = parsed.data;

    if (auth.profile.role !== "admin") {
      if (rest.user_id !== undefined || regenerate_token || rest.slug !== undefined) {
        return NextResponse.json(
          { success: false, message: "אין הרשאה לשינוי זה" },
          { status: 403 }
        );
      }
    }

    if (regenerate_token) {
      if (auth.profile.role !== "admin") {
        return NextResponse.json({ success: false, message: "אין הרשאה" }, { status: 403 });
      }
      const row = await regeneratePublicToken(id);
      return NextResponse.json({ success: true, data: row });
    }

    const clientRest =
      auth.profile.role === "admin"
        ? rest
        : {
            ...(rest.name !== undefined ? { name: rest.name } : {}),
            ...(rest.is_active !== undefined ? { is_active: rest.is_active } : {}),
          };

    if (Object.keys(clientRest).length === 0) {
      return NextResponse.json(
        { success: false, message: "נדרש לפחות שדה אחד" },
        { status: 400 }
      );
    }

    const row = await updateLandingPage(id, clientRest);
    return NextResponse.json({ success: true, data: row });
  } catch (e) {
    const err = e as { code?: string };
    const mapped = nextResponseForServiceError("[PATCH /api/landing-pages/:id]", e);
    if (mapped) return mapped;
    if (err.code === "NOT_FOUND") {
      return NextResponse.json({ success: false, message: "לא נמצא" }, { status: 404 });
    }
    console.error("[PATCH /api/landing-pages/:id]", formatSupabaseErrorForLog(e));
    return NextResponse.json({ success: false, message: "שגיאת שרת" }, { status: 500 });
  }
}
