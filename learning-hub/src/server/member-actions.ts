"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { actionMember } from "@/lib/auth";
import { fail, type ActionResult } from "@/lib/types";
import { deadlineLock, hasCourseAccess } from "@/lib/access";
import { checkCanStart, finalizeAttempt } from "@/lib/quiz";
import { issueCertificates } from "@/lib/certificates";

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
  const quiz = await prisma.quiz.findUniqueOrThrow({ where: { id: quizId } });
  const now = new Date();
  let deadline = new Date(now.getTime() + quiz.timeLimitMinutes * 60_000);
  if (check.deadlineCap && check.deadlineCap < deadline) deadline = check.deadlineCap;
  const attempt = await prisma.attempt.create({
    data: { quizId, userId: user.id, number: check.attemptsUsed + 1, startedAt: now, deadlineAt: deadline },
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
  if (selectedIndex < 0 || selectedIndex > 3) return fail("Đáp án không hợp lệ.");
  await prisma.answer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    create: { attemptId, questionId, selectedIndex },
    update: { selectedIndex },
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
