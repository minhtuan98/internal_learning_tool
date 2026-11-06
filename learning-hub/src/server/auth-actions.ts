"use server";

import { devLoginEnabled, signInWithEmail } from "@/lib/auth";
import { afterSignInPath } from "@/lib/welcome";

/** Local quick sign-in: same allowlist and lock rules as Google sign-in. */
export async function devSignIn(email: string) {
  if (!devLoginEnabled()) return { ok: false as const, redirect: "/login" };
  const r = await signInWithEmail(email);
  if (!r.ok) return { ok: false as const, redirect: `/denied?reason=${r.reason}&email=${encodeURIComponent(email)}` };
  return { ok: true as const, redirect: await afterSignInPath(r.role) };
}
