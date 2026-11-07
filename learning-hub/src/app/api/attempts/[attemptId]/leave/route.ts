import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * Beacon from the quiz page when it is closed, reloaded or left (pagehide / unmount): stamps attempts.leftAt.
 * When the page is opened again, checkReturn() decides whether that absence counts (DESIGN_SYSTEM.md → Quiz integrity).
 * The session cookie is SameSite=Lax, so other sites cannot send this for a member; the Origin check is a second guard.
 */
export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return new Response(null, { status: 403 });
  const user = await getCurrentUser();
  if (!user || user.role !== "MEMBER") return new Response(null, { status: 401 });
  const { attemptId } = await params;
  await prisma.attempt.updateMany({ where: { id: attemptId, userId: user.id, status: "IN_PROGRESS" }, data: { leftAt: new Date() } });
  return new Response(null, { status: 204 });
}
