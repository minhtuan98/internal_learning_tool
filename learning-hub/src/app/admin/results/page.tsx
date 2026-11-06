import { prisma } from "@/lib/db";
import { learningProgress, quizResults } from "@/lib/stats";
import { getMaxViolations, integrityRows } from "@/lib/integrity";
import ResultsClient from "./ResultsClient";

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ tab?: string; course?: string; quiz?: string; group?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab === "progress" ? "progress" : sp.tab === "integrity" ? "integrity" : "quiz";
  const [courses, quizzes, groups] = await Promise.all([
    prisma.course.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.quiz.findMany({ where: sp.course ? { courseId: sp.course } : {}, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.group.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const quizRows = tab === "quiz" ? await quizResults({ courseId: sp.course, quizId: sp.quiz, groupId: sp.group }) : [];
  const progressRows = tab === "progress" ? await learningProgress({ courseId: sp.course, groupId: sp.group }) : [];
  const integrity = tab === "integrity" ? { ...(await integrityRows({ courseId: sp.course, quizId: sp.quiz, groupId: sp.group })), maxViolations: await getMaxViolations() } : null;
  return (
    <ResultsClient
      tab={tab}
      filter={{ course: sp.course ?? null, quiz: sp.quiz ?? null, group: sp.group ?? null }}
      courses={courses}
      quizzes={quizzes}
      groups={groups}
      quizRows={quizRows}
      progressRows={progressRows}
      integrity={integrity}
    />
  );
}
