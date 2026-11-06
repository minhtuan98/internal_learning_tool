import { cookies } from "next/headers";

/** Welcome screen (DESIGN_SYSTEM.md → Screens → Welcome): shown after every sign-in unless the user opted out. */
export const SKIP_WELCOME_COOKIE = "lh_skip_welcome";

export const homeFor = (role: string) => (role === "ADMIN" ? "/admin/dashboard" : "/learn");

export async function afterSignInPath(role: string) {
  const skip = (await cookies()).get(SKIP_WELCOME_COOKIE)?.value === "1";
  return skip ? homeFor(role) : "/welcome";
}
