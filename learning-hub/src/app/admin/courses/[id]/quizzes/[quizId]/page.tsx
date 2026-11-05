import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { aiConfigured } from "@/lib/ai";
import { displayName } from "@/lib/format";
import { finalizeExpiredAttempts } from "@/lib/quiz";
import { parseOptions } from "@/lib/types";
import QuizDetailClient from "./QuizDetailClient";

export default async function QuizPage({ params, searchParams }: { params: Promise<{ id: string; quizId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id, quizId } = await params;
  const { tab } = await searchParams;
  await finalizeExpiredAttempts({ quizId });
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: { include: { lessons: { orderBy: { position: "asc" } } } },
      sources: true,
      questions: { orderBy: { position: "asc" } },
      attempts: { include: { user: { include: { group: true } } }, orderBy: { startedAt: "desc" } },
    },
  });
  if (!quiz || quiz.courseId !== id) notFound();
  const submitted = quiz.attempts.filter((a) => a.status === "SUBMITTED");
  const people = new Set(quiz.attempts.map((a) => a.userId)).size;
  return (
    <QuizDetailClient
      tab={tab ?? "questions"}
      aiMode={aiConfigured() ? "claude" : "sample"}
      quiz={{
        id: quiz.id,
        title: quiz.title,
        status: quiz.status,
        passScore: quiz.passScore,
        timeLimitMinutes: quiz.timeLimitMinutes,
        maxAttempts: quiz.maxAttempts,
        opensAt: quiz.opensAt,
        closesAt: quiz.closesAt,
        sourceIds: quiz.sources.map((s) => s.lessonId),
      }}
      course={{ id: quiz.course.id, title: quiz.course.title, lessons: quiz.course.lessons.map((l) => ({ id: l.id, title: l.title, type: l.type, hasTranscript: Boolean(l.transcript) })) }}
      questions={quiz.questions.map((q) => ({ id: q.id, text: q.text, options: parseOptions(q.options), correctIndex: q.correctIndex, explanation: q.explanation, reviewStatus: q.reviewStatus, edited: q.edited, sample: q.text.startsWith("[Câu hỏi mẫu]") }))}
      attempts={quiz.attempts.map((a) => ({ id: a.id, name: displayName(a.user), group: a.user.group?.name ?? null, number: a.number, status: a.status, score: a.score, passed: a.passed, startedAt: a.startedAt, submittedAt: a.submittedAt, auto: a.autoSubmitted }))}
      stats={{
        people,
        passRate: submitted.length ? Math.round((submitted.filter((a) => a.passed).length / submitted.length) * 100) : null,
        avg: submitted.length ? Math.round(submitted.reduce((s, a) => s + (a.score ?? 0), 0) / submitted.length) : null,
      }}
    />
  );
}
