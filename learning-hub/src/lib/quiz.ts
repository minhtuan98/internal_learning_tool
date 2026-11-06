import { prisma } from "./db";
import { deadlineLock, hasCourseAccess } from "./access";
import { pct } from "./format";
import { issueCertificates } from "./certificates";

type UserLike = { id: string; groupId: string | null };
const GRACE_MS = 5_000;

/** Scores an attempt by code (HLD §6 principle 1). Unanswered questions count as wrong. */
export async function finalizeAttempt(attemptId: string, auto = false) {
  const a = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { quiz: { include: { questions: { where: { reviewStatus: "APPROVED" } } } }, answers: true },
  });
  if (!a || a.status === "SUBMITTED") return a;
  const answers = new Map(a.answers.map((x) => [x.questionId, x]));
  let correct = 0;
  const ops = [];
  for (const q of a.quiz.questions) {
    const ans = answers.get(q.id);
    const ok = ans ? ans.selectedIndex === q.correctIndex : false;
    if (ok) correct++;
    if (ans) ops.push(prisma.answer.update({ where: { id: ans.id }, data: { isCorrect: ok } }));
  }
  const total = a.quiz.questions.length;
  const score = pct(correct, total);
  const now = new Date();
  ops.push(
    prisma.attempt.update({
      where: { id: a.id },
      data: {
        status: "SUBMITTED",
        submittedAt: auto && now > a.deadlineAt ? a.deadlineAt : now,
        autoSubmitted: auto,
        score,
        passed: score >= a.quiz.passScore,
        correctCount: correct,
        totalCount: total,
      },
    }),
  );
  await prisma.$transaction(ops);
  // A passing attempt may complete the course → certificate (DESIGN_SYSTEM.md → Certificates)
  if (score >= a.quiz.passScore) await issueCertificates(a.userId, [a.quiz.courseId]);
  return prisma.attempt.findUnique({ where: { id: a.id } });
}

/** Attempts whose time ran out are submitted automatically with the answers saved so far. */
export async function finalizeExpiredAttempts(filter: { userId?: string; quizId?: string } = {}) {
  const expired = await prisma.attempt.findMany({
    where: { status: "IN_PROGRESS", deadlineAt: { lt: new Date(Date.now() - GRACE_MS) }, ...filter },
    select: { id: true },
  });
  for (const e of expired) await finalizeAttempt(e.id, true);
}

export type StartCheck =
  | { ok: true; attemptsUsed: number; inProgressId: string | null; deadlineCap: Date | null }
  | { ok: false; reason: string; attemptsUsed: number; inProgressId: null };

/** Rules for starting a quiz (DEC-016, DEC-021, DEC-059). */
export async function checkCanStart(user: UserLike, quizId: string, now = new Date()): Promise<StartCheck> {
  await finalizeExpiredAttempts({ userId: user.id, quizId });
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { course: true, _count: { select: { questions: { where: { reviewStatus: "APPROVED" } } } } },
  });
  const attempts = await prisma.attempt.findMany({ where: { userId: user.id, quizId } });
  const used = attempts.length;
  const inProgress = attempts.find((a) => a.status === "IN_PROGRESS");
  const no = (reason: string): StartCheck => ({ ok: false, reason, attemptsUsed: used, inProgressId: null });

  if (!quiz || quiz.status !== "PUBLISHED" || quiz.course.status !== "PUBLISHED") return no("Quiz này hiện không mở.");
  if (!(await hasCourseAccess(user, quiz.courseId))) return no("Bạn chưa có quyền truy cập khóa học của quiz này.");
  if (inProgress) return { ok: true, attemptsUsed: used, inProgressId: inProgress.id, deadlineCap: null };
  const lock = await deadlineLock(user, quiz.courseId, now);
  if (lock.locked) return no("Khóa học đã quá hạn, bạn không thể làm quiz này nữa.");
  if (quiz._count.questions === 0) return no("Quiz chưa có câu hỏi nào được duyệt.");
  if (quiz.opensAt && now < quiz.opensAt) return no("Quiz chưa đến giờ mở.");
  if (quiz.closesAt && now > quiz.closesAt) return no("Quiz đã hết thời gian mở.");
  if (used >= quiz.maxAttempts) return no("Bạn đã dùng hết số lượt làm bài.");
  const caps = [quiz.closesAt, lock.activeDeadline].filter((d): d is Date => Boolean(d));
  const cap = caps.length ? new Date(Math.min(...caps.map((d) => d.getTime()))) : null;
  return { ok: true, attemptsUsed: used, inProgressId: null, deadlineCap: cap };
}
