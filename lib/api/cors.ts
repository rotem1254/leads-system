import { NextResponse } from "next/server";

const DEFAULT_ORIGIN = "*";

export function getCorsHeaders(): Record<string, string> {
  const allowed = process.env.ALLOWED_ORIGINS?.trim();
  return {
    "Access-Control-Allow-Origin": allowed || DEFAULT_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function corsJson(
  data: unknown,
  init?: ResponseInit & { status?: number }
): NextResponse {
  const headers = new Headers(init?.headers);
  const cors = getCorsHeaders();
  Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
  return NextResponse.json(data, { ...init, headers });
}
