import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { finalizeExpiredAttempts } from "@/lib/quiz";
import { parseOptions } from "@/lib/types";
import { checkReturn, getMaxViolations, orderForAttempt, toDisplaySlot } from "@/lib/integrity";
import { clientInfo } from "@/lib/client-info";
import { displayName } from "@/lib/format";
import TakeQuizClient from "./TakeQuizClient";

export default async function TakeQuizPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireMember();
  await finalizeExpiredAttempts({ userId: user.id });
  const a = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { quiz: { include: { course: true, questions: { where: { reviewStatus: "APPROVED" }, orderBy: { position: "asc" } } } }, answers: true },
  });
  if (!a || a.userId !== user.id) notFound();
  if (a.status === "SUBMITTED") redirect(`/learn/attempts/${a.id}/result`);
  // Came back after closing / reloading / leaving the page for ≥ 3 s → LEFT_PAGE violation (may void the attempt)
  const back = await checkReturn(a, await clientInfo());
  if (back?.voided) redirect(`/learn/attempts/${a.id}/result`);
  const maxViolations = await getMaxViolations();
  return (
    <TakeQuizClient
      attempt={{ id: a.id, number: a.number, deadlineAt: a.deadlineAt.toISOString(), serverNow: new Date().toISOString(), violations: back?.count ?? a.violations }}
      pendingWarning={back}
      quiz={{ id: a.quiz.id, title: a.quiz.title, maxAttempts: a.quiz.maxAttempts, course: a.quiz.course.title }}
      // Correct answers are never sent to the browser. Questions and options come in this attempt's own order.
      questions={orderForAttempt(a, a.quiz.questions.map((q) => ({ id: q.id, text: q.text, options: parseOptions(q.options) })))}
      answers={Object.fromEntries(a.answers.map((x) => [x.questionId, toDisplaySlot(a, x.questionId, x.selectedIndex)]))}
      integrity={{ maxViolations, viewer: `${displayName(user)} · ${user.employeeCode}` }}
    />
  );
}
