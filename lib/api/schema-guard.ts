import "server-only";

import { NextResponse } from "next/server";
import { corsJson } from "@/lib/api/cors";
import { getSchemaReadiness } from "@/lib/supabase/schema-readiness";

/** Returns 503 JSON if migrations/schema are incomplete; otherwise null (caller continues). */
export async function ensureSchemaNextResponse(): Promise<NextResponse | null> {
  const r = await getSchemaReadiness();
  if (r.ok) return null;
  return NextResponse.json(
    { success: false, message: r.message, code: r.code },
    { status: 503 }
  );
}

/** CORS JSON variant for public POST /api/leads. */
export async function ensureSchemaCorsJson(): Promise<ReturnType<typeof corsJson> | null> {
  const r = await getSchemaReadiness();
  if (r.ok) return null;
  return corsJson(
    { success: false, message: r.message, code: r.code },
    { status: 503 }
  );
}
