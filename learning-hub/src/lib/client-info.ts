import { headers } from "next/headers";

/** Client network + browser of the current request, for anti-cheat signals (never used to block on its own). */
export async function clientInfo(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim() || null;
    return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
  } catch {
    return { ip: null, userAgent: null }; // outside a request (scripts, tests)
  }
}
