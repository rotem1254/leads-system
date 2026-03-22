import "server-only";

import { NextResponse } from "next/server";
import {
  formatSupabaseErrorForLog,
  isSchemaCacheMissingError,
  isUndefinedColumnError,
} from "@/lib/supabase/errors";

/**
 * Maps service-layer throws to HTTP responses. Returns null if caller should handle (500).
 */
export function nextResponseForServiceError(
  routeLabel: string,
  e: unknown
): NextResponse | null {
  const err = e as { code?: string };
  if (err.code === "SERVICE_UNAVAILABLE") {
    return NextResponse.json(
      { success: false, message: "מסד נתונים לא מוגדר" },
      { status: 503 }
    );
  }
  if (isSchemaCacheMissingError(e) || isUndefinedColumnError(e)) {
    console.error(routeLabel, formatSupabaseErrorForLog(e));
    return NextResponse.json(
      {
        success: false,
        message:
          "סכמת מסד נתונים חסרה — הריצו מיגרציות 001 ואז 002 ב-Supabase (ראו README).",
        code: isSchemaCacheMissingError(e) ? "PGRST205" : "SCHEMA_MISMATCH",
      },
      { status: 503 }
    );
  }
  return null;
}
