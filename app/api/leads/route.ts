import { NextRequest, NextResponse } from "next/server";
import { ensureSchemaCorsJson, ensureSchemaNextResponse } from "@/lib/api/schema-guard";
import { nextResponseForServiceError } from "@/lib/api/service-error";
import { getAuthContext } from "@/lib/auth/server-context";
import { corsJson, getCorsHeaders } from "@/lib/api/cors";
import { getLandingPageByToken } from "@/lib/landing-pages/service";
import { insertLeadFromPublic, listLeads } from "@/lib/leads/service";
import { rateLimitPublicPost } from "@/lib/rate-limit";
import {
  formatErrorStackForLog,
  formatSupabaseErrorForLog,
  isForeignKeyViolationError,
  isSchemaCacheMissingError,
  isUndefinedColumnError,
} from "@/lib/supabase/errors";
import {
  adminLeadListQuerySchema,
  createLeadPublicSchema,
} from "@/lib/validation/leads";

const DEBUG_LEADS =
  process.env.DEBUG_LEADS_API === "1" || process.env.DEBUG_LEADS_API === "true";

function debugLeadsPost(
  stage: string,
  info: Record<string, string | number | boolean | undefined>
) {
  if (!DEBUG_LEADS) return;
  console.warn(`[POST /api/leads][debug] ${stage}`, info);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders() });
}

/** Public: create lead from external landing pages */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rl = rateLimitPublicPost(`post:${ip}`);
  if (!rl.ok) {
    return corsJson(
      {
        success: false,
        message: "Too many requests — try again shortly",
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return corsJson(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = createLeadPublicSchema.safeParse(body);
  if (!parsed.success) {
    return corsJson(
      {
        success: false,
        message: "Validation error",
        errors: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { landing_token, ...rest } = parsed.data;

  const schemaBlock = await ensureSchemaCorsJson();
  if (schemaBlock) return schemaBlock;

  debugLeadsPost("validated", {
    landing_token_len: landing_token.length,
    landing_token_prefix: `${landing_token.slice(0, 6)}…`,
    page_source_len: rest.page_source.length,
  });

  try {
    const page = await getLandingPageByToken(landing_token);
    if (!page) {
      debugLeadsPost("lookup", { result: "not_found" });
      return corsJson(
        { success: false, message: "Landing page not found" },
        { status: 404 }
      );
    }
    debugLeadsPost("lookup", {
      result: "found",
      landing_page_id: page.id,
      is_active: page.is_active,
    });
    if (!page.is_active) {
      return corsJson(
        { success: false, message: "Landing page inactive" },
        { status: 403 }
      );
    }

    const { id } = await insertLeadFromPublic({
      ...rest,
      landing_page_id: page.id,
      user_id: page.user_id,
    });
    debugLeadsPost("insert", { result: "ok", leadId_prefix: id.slice(0, 8) });
    return corsJson({
      success: true,
      message: "Lead created successfully",
      leadId: id,
    });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "SERVICE_UNAVAILABLE") {
      return corsJson(
        {
          success: false,
          message: "Service unavailable — missing service role key",
        },
        { status: 503 }
      );
    }
    if (isSchemaCacheMissingError(e)) {
      console.error("[POST /api/leads]", formatSupabaseErrorForLog(e));
      return corsJson(
        {
          success: false,
          message:
            "Database schema is not ready — run supabase/migrations in Supabase SQL Editor (001_leads.sql, then 002_platform_multiclient.sql).",
          code: "PGRST205",
        },
        { status: 503 }
      );
    }
    if (isUndefinedColumnError(e)) {
      console.error("[POST /api/leads]", formatSupabaseErrorForLog(e));
      return corsJson(
        {
          success: false,
          message:
            "Database columns missing — apply 002_platform_multiclient.sql (e.g. landing_pages, leads.landing_page_id, leads.user_id).",
          code: "SCHEMA_MISMATCH",
        },
        { status: 503 }
      );
    }
    if (isForeignKeyViolationError(e)) {
      console.error("[POST /api/leads] fk", formatSupabaseErrorForLog(e));
      return corsJson(
        {
          success: false,
          message: "Invalid landing page reference — check migrations and landing_pages data.",
          code: "23503",
        },
        { status: 400 }
      );
    }
    debugLeadsPost("error", {
      code: (e as { code?: string }).code ?? "unknown",
    });
    console.error(
      "[POST /api/leads]",
      formatSupabaseErrorForLog(e),
      formatErrorStackForLog(e)
    );
    return corsJson(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

/** Authenticated: list leads (admin: all; client: own) */
export async function GET(req: NextRequest) {
  const schemaBlocked = await ensureSchemaNextResponse();
  if (schemaBlocked) return schemaBlocked;

  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ success: false, message: "לא מורשה" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const raw = {
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
    q: searchParams.get("q"),
    status: searchParams.get("status"),
    page_source: searchParams.get("page_source"),
    user_id: searchParams.get("user_id"),
    landing_page_id: searchParams.get("landing_page_id"),
  };

  const parsed = adminLeadListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Validation error",
        errors: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { page, limit, q, status, page_source, user_id, landing_page_id } =
    parsed.data;

  if (ctx.profile.role === "client" && user_id) {
    return NextResponse.json(
      { success: false, message: "אין הרשאה לסינון זה" },
      { status: 403 }
    );
  }

  try {
    const scope =
      ctx.profile.role === "admin"
        ? undefined
        : { role: "client" as const, userId: ctx.user.id };

    const { rows, total } = await listLeads({
      page,
      limit,
      q,
      status,
      page_source,
      user_id: ctx.profile.role === "admin" ? user_id : undefined,
      landing_page_id,
      scope,
    });
    return NextResponse.json({
      success: true,
      rows,
      total,
      page,
      limit,
    });
  } catch (e) {
    const mapped = nextResponseForServiceError("[GET /api/leads]", e);
    if (mapped) return mapped;
    console.error("[GET /api/leads]", formatSupabaseErrorForLog(e));
    return NextResponse.json(
      { success: false, message: "שגיאת שרת" },
      { status: 500 }
    );
  }
}
