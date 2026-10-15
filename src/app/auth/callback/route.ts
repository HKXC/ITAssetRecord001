import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Auth callback: exchanges the one-time `code` from an emailed link for a session.
 *
 * `@supabase/ssr` forces the PKCE flow (flowType: "pkce" in createServerClient), so the
 * link a user clicks lands here with `?code=...` — the code can only be redeemed once and
 * the verifier lives in a cookie, which is why this must be server-side rather than
 * decoded in the browser.
 *
 * Today the only flow that reaches this route is password recovery, so the destination is
 * fixed: accepting a caller-supplied `next` would add an open-redirect surface for no
 * benefit. Add a dedicated route per additional flow instead of a wildcard.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/forgot-password?error=link", request.url));
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Expired or already-used links land here; the user needs a fresh one.
      console.error("[auth] code exchange failed", error.status, error.message);
      return NextResponse.redirect(new URL("/forgot-password?error=link", request.url));
    }
  } catch (cause) {
    console.error("[auth] code exchange threw", cause);
    return NextResponse.redirect(new URL("/forgot-password?error=link", request.url));
  }

  return NextResponse.redirect(new URL("/reset-password", request.url));
}
