import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { finalizeExpiredAttempts } from "@/lib/quiz";
import { parseOptions } from "@/lib/types";
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
  return (
    <TakeQuizClient
      attempt={{ id: a.id, number: a.number, deadlineAt: a.deadlineAt.toISOString(), serverNow: new Date().toISOString() }}
      quiz={{ id: a.quiz.id, title: a.quiz.title, maxAttempts: a.quiz.maxAttempts, course: a.quiz.course.title }}
      // Correct answers are never sent to the browser.
      questions={a.quiz.questions.map((q) => ({ id: q.id, text: q.text, options: parseOptions(q.options) }))}
      answers={Object.fromEntries(a.answers.map((x) => [x.questionId, x.selectedIndex]))}
    />
  );
}
