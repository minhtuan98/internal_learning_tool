import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleEnabled } from "@/lib/auth";

/** Starts Google Sign-In (DEC-011). */
export async function GET() {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/login?error=google_off", process.env.APP_URL));
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("lh_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
