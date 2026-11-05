import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

const COOKIE = "lh_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secretKey() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (at least 32 characters).");
  return new TextEncoder().encode(s);
}

const secureCookie = () => (process.env.APP_URL ?? "").startsWith("https://");

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(),
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export type SignInOutcome = { ok: true; role: string } | { ok: false; reason: "NOT_ALLOWED" | "LOCKED" };

/**
 * Allowlist sign-in shared by Google and local quick sign-in (DEC-011, DEC-012, DEC-028).
 * Full name and avatar come from Google at first sign-in (DEC-031).
 */
export async function signInWithEmail(
  rawEmail: string,
  profile?: { name?: string | null; picture?: string | null },
): Promise<SignInOutcome> {
  const email = rawEmail.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false, reason: "NOT_ALLOWED" };
  if (user.status === "LOCKED") return { ok: false, reason: "LOCKED" };
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastSignInAt: new Date(),
      fullName: user.fullName || profile?.name || null,
      avatarUrl: profile?.picture ?? user.avatarUrl,
    },
  });
  await createSession(user.id);
  return { ok: true, role: user.role };
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { group: true } });
    if (!user || user.status !== "ACTIVE") return null;
    return user;
  } catch {
    return null;
  }
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/learn");
  return user;
}

export async function requireMember() {
  const user = await requireUser();
  // Admins do not learn or take quizzes (DEC-029).
  if (user.role !== "MEMBER") redirect("/admin");
  return user;
}

/** For server actions: returns the admin or null (caller returns an error result). */
export async function actionAdmin() {
  const user = await getCurrentUser();
  return user && user.role === "ADMIN" ? user : null;
}

export async function actionMember() {
  const user = await getCurrentUser();
  return user && user.role === "MEMBER" ? user : null;
}

export const devLoginEnabled = () => process.env.AUTH_DEV_LOGIN === "true";
export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
