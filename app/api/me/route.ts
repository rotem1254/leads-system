import { NextResponse } from "next/server";
import { ensureSchemaNextResponse } from "@/lib/api/schema-guard";
import { getAuthContext } from "@/lib/auth/server-context";

export async function GET() {
  const blocked = await ensureSchemaNextResponse();
  if (blocked) return blocked;

  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ success: false, message: "לא מורשה" }, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    user: {
      id: ctx.user.id,
      email: ctx.user.email,
    },
    profile: ctx.profile,
  });
}
