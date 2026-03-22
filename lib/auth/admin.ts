import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

const unauthorized = () =>
  NextResponse.json(
    { success: false, message: "Unauthorized" },
    { status: 401 }
  );

const notConfigured = () =>
  NextResponse.json(
    { success: false, message: "Admin API not configured" },
    { status: 500 }
  );

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth) {
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (m?.[1]) return m[1].trim();
  }
  const x = req.headers.get("x-admin-token");
  if (x?.trim()) return x.trim();
  return null;
}

/**
 * @deprecated האימות ל-API מבוסס כעת על סשן Supabase + טבלת profiles.
 * נשמר לתאימות אחורה אם יש סקריפטים חיצוניים שעדיין שולחים ADMIN_TOKEN.
 * Returns a `NextResponse` on failure, or `null` when the caller may proceed.
 */
export function requireAdmin(req: Request): NextResponse | null {
  const envToken = process.env.ADMIN_TOKEN;
  if (envToken === undefined || envToken.length === 0) {
    return notConfigured();
  }

  const presented = extractBearerToken(req);
  if (presented === null) {
    return unauthorized();
  }

  if (!safeEqual(presented, envToken)) {
    return unauthorized();
  }

  return null;
}
