import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signInWithEmail } from "@/lib/auth";
import { afterSignInPath } from "@/lib/welcome";

export async function GET(req: Request) {
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("lh_oauth_state")?.value;
  jar.delete("lh_oauth_state");
  if (!code || !state || state !== expected) return NextResponse.redirect(new URL("/login?error=state", base));

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${base}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return NextResponse.redirect(new URL("/login?error=google", base));
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
  if (!infoRes.ok) return NextResponse.redirect(new URL("/login?error=google", base));
  const info = (await infoRes.json()) as { email?: string; email_verified?: boolean; name?: string; picture?: string };
  if (!info.email || !info.email_verified) return NextResponse.redirect(new URL("/login?error=google", base));

  const r = await signInWithEmail(info.email, { name: info.name, picture: info.picture });
  if (!r.ok) return NextResponse.redirect(new URL(`/denied?reason=${r.reason}&email=${encodeURIComponent(info.email)}`, base));
  return NextResponse.redirect(new URL(await afterSignInPath(r.role), base));
}
