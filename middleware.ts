import { type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip Supabase session refresh for dev-only env probe (no cookies needed)
    "/((?!_next/static|_next/image|favicon.ico|api/debug|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
