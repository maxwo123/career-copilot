import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code && !request.nextUrl.searchParams.has("error")) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return new Response(null, { status: 303, headers: { Location: "/reset-password", "Cache-Control": "no-store" } });
    }
  }
  // Fixed destinations prevent an untrusted next/redirect URL from redirecting off-site.
  return new Response(null, { status: 303, headers: { Location: "/forgot-password?error=invalid_link", "Cache-Control": "no-store" } });
}
