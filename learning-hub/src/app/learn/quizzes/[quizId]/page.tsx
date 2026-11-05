import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { checkCanStart } from "@/lib/quiz";
import NoAccess from "@/components/NoAccess";
import { courseGuard } from "../../courses/[id]/guard";
import QuizIntroClient from "./QuizIntroClient";

export default async function QuizIntroPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const user = await requireMember();
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { _count: { select: { questions: { where: { reviewStatus: "APPROVED" } } } } } });
  if (!quiz || quiz.status !== "PUBLISHED") notFound();
  const g = await courseGuard(user, quiz.courseId);
  if (!g.ok) return <NoAccess assigned={g.assigned} />;
  const check = await checkCanStart(user, quizId);
  const attempts = await prisma.attempt.findMany({ where: { userId: user.id, quizId }, orderBy: { number: "desc" } });
  return (
    <QuizIntroClient
      course={{ id: g.course.id, title: g.course.title }}
      quiz={{ id: quiz.id, title: quiz.title, questions: quiz._count.questions, passScore: quiz.passScore, timeLimitMinutes: quiz.timeLimitMinutes, maxAttempts: quiz.maxAttempts, opensAt: quiz.opensAt, closesAt: quiz.closesAt }}
      check={check.ok ? { ok: true, resume: Boolean(check.inProgressId) } : { ok: false, reason: check.reason }}
      deadline={g.lock.activeDeadline ?? g.lock.deadline}
      locked={g.lock.locked}
      attempts={attempts.map((a) => ({ id: a.id, number: a.number, status: a.status, score: a.score, passed: a.passed, submittedAt: a.submittedAt, auto: a.autoSubmitted }))}
    />
  );
}
