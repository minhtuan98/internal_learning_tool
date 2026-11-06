"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { actionMember } from "@/lib/auth";
import { fail, type ActionResult } from "@/lib/types";
import { deadlineLock, hasCourseAccess } from "@/lib/access";
import { checkCanStart, finalizeAttempt } from "@/lib/quiz";
import { issueCertificates } from "@/lib/certificates";
import { buildOrder, getMaxViolations, toOriginalIndex, VIOLATION_TYPES, voidAttempt, type ViolationType } from "@/lib/integrity";
import { parseOptions } from "@/lib/types";

/** Client network + browser, for anti-cheat signals (never used to block on its own). */
async function clientInfo(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim() || null;
    return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
  } catch {
    return { ip: null, userAgent: null }; // outside a request (scripts, tests)
  }
}

export async function completeLesson(lessonId: string): Promise<ActionResult> {
  const user = await actionMember();
  if (!user) return fail("Phiên đăng nhập đã hết hạn.");
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || !(await hasCourseAccess(user, lesson.courseId))) return fail("Bạn không có quyền truy cập bài học này.");
  if ((await deadlineLock(user, lesson.courseId)).locked) return fail("Khóa học đã quá hạn, bạn không thể học tiếp.");
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    create: { userId: user.id, lessonId },
    update: {},
  });
  const issued = await issueCertificates(user.id, [lesson.courseId]);
  revalidatePath(`/learn/courses/${lesson.courseId}`);
  revalidatePath("/learn/certificates");
  return { ok: true, message: issued ? "Bạn đã hoàn thành khóa học và nhận được chứng chỉ!" : "Đã đánh dấu học xong bài này." };
}

/** Starts (or resumes) an attempt; start time is server time (HLD 4.3). */
export async function startAttempt(quizId: string): Promise<ActionResult<{ attemptId: string }>> {
  const user = await actionMember();
  if (!user) return fail("Phiên đăng nhập đã hết hạn.");
  const check = await checkCanStart(user, quizId);
  if (!check.ok) return fail(check.reason);
  if (check.inProgressId) return { ok: true, data: { attemptId: check.inProgressId } };
  const quiz = await prisma.quiz.findUniqueOrThrow({ where: { id: quizId }, include: { questions: { where: { reviewStatus: "APPROVED" }, select: { id: true, options: true } } } });
  const now = new Date();
  let deadline = new Date(now.getTime() + quiz.timeLimitMinutes * 60_000);
  if (check.deadlineCap && check.deadlineCap < deadline) deadline = check.deadlineCap;
  // Own question + option order per attempt (anti-cheat: shared "Q3 = B" answers are useless)
  const order = buildOrder((quiz.questions ?? []).map((q) => ({ id: q.id, optionCount: parseOptions(q.options).length })));
  const { ip } = await clientInfo();
  const attempt = await prisma.attempt.create({
    data: { quizId, userId: user.id, number: check.attemptsUsed + 1, startedAt: now, deadlineAt: deadline, ...order, ip },
  });
  return { ok: true, data: { attemptId: attempt.id } };
}

/** Autosave of one answer while the attempt is open. */
export async function saveAnswer(attemptId: string, questionId: string, selectedIndex: number): Promise<ActionResult> {
  const user = await actionMember();
  if (!user) return fail("Phiên đăng nhập đã hết hạn.");
  const a = await prisma.attempt.findUnique({ where: { id: attemptId } });
  if (!a || a.userId !== user.id) return fail("Không tìm thấy lượt làm bài.");
  if (a.status !== "IN_PROGRESS" || new Date() > new Date(a.deadlineAt.getTime() + 5_000)) return fail("Đã hết giờ làm bài.");
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) return fail("Đáp án không hợp lệ.");
  // The question must belong to this attempt's quiz and be one the member was shown (approved).
  const q = await prisma.question.findUnique({ where: { id: questionId }, select: { quizId: true, reviewStatus: true } });
  if (!q || q.quizId !== a.quizId || q.reviewStatus !== "APPROVED") return fail("Câu hỏi không thuộc bài quiz này.");
  // The browser sends the slot it showed; store the original option index (options are shuffled per attempt).
  const original = toOriginalIndex(a, questionId, selectedIndex);
  await prisma.answer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    create: { attemptId, questionId, selectedIndex: original },
    update: { selectedIndex: original },
  });
  return { ok: true };
}

export async function submitAttempt(attemptId: string, auto = false): Promise<ActionResult> {
  const user = await actionMember();
  if (!user) return fail("Phiên đăng nhập đã hết hạn.");
  const a = await prisma.attempt.findUnique({ where: { id: attemptId } });
  if (!a || a.userId !== user.id) return fail("Không tìm thấy lượt làm bài.");
  await finalizeAttempt(attemptId, auto || new Date() > a.deadlineAt);
  return { ok: true };
}

/**
 * Anti-cheat: one violation (left the quiz, copy, right-click, print, Print Screen) during an open attempt.
 * Over the admin threshold the attempt is voided (0 points, attempt used).
 */
export async function reportViolation(attemptId: string, type: ViolationType, durationMs?: number): Promise<ActionResult<{ count: number; max: number; voided: boolean }>> {
  const user = await actionMember();
  if (!user) return fail("Phiên đăng nhập đã hết hạn.");
  if (!VIOLATION_TYPES.includes(type)) return fail("Loại vi phạm không hợp lệ.");
  const a = await prisma.attempt.findUnique({ where: { id: attemptId } });
  if (!a || a.userId !== user.id) return fail("Không tìm thấy lượt làm bài.");
  const max = await getMaxViolations();
  if (a.status !== "IN_PROGRESS") return { ok: true, data: { count: a.violations, max, voided: a.voided } };
  const info = await clientInfo();
  const ms = Number.isFinite(durationMs) ? Math.max(0, Math.min(Math.round(durationMs!), 86_400_000)) : null;
  const [, updated] = await prisma.$transaction([
    prisma.attemptEvent.create({ data: { attemptId, type, durationMs: ms, ...info } }),
    prisma.attempt.update({ where: { id: attemptId }, data: { violations: { increment: 1 } } }),
  ]);
  const voided = updated.violations > max;
  if (voided) await voidAttempt(attemptId);
  return { ok: true, data: { count: updated.violations, max, voided } };
}

/**
 * Anti-cheat signal: the open quiz pings every ~30 s with a per-tab token. A second token on the same
 * attempt (another tab or device) is logged once as MULTI_SESSION — a flag for admins, not a violation.
 */
export async function attemptHeartbeat(attemptId: string, tabToken: string): Promise<ActionResult<{ status: string }>> {
  const user = await actionMember();
  if (!user) return fail("Phiên đăng nhập đã hết hạn.");
  const token = String(tabToken ?? "").slice(0, 64);
  const a = await prisma.attempt.findUnique({ where: { id: attemptId } });
  if (!a || a.userId !== user.id) return fail("Không tìm thấy lượt làm bài.");
  if (a.status !== "IN_PROGRESS" || !token) return { ok: true, data: { status: a.status } };
  if (!a.sessionToken) {
    await prisma.attempt.updateMany({ where: { id: attemptId, sessionToken: null }, data: { sessionToken: token } });
  } else if (a.sessionToken !== token) {
    const seen = await prisma.attemptEvent.count({ where: { attemptId, type: "MULTI_SESSION", detail: token } });
    if (!seen) await prisma.attemptEvent.create({ data: { attemptId, type: "MULTI_SESSION", violation: false, detail: token, ...(await clientInfo()) } });
  }
  return { ok: true, data: { status: a.status } };
}
