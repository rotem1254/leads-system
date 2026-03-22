import { NextResponse } from "next/server";

/** Env is read per request; avoid static caching of this route. */
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    adminToken: process.env.ADMIN_TOKEN || null,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
  });
}
