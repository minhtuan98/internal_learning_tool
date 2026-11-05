import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { displayName } from "@/lib/format";
import { finalizeExpiredAttempts } from "@/lib/quiz";
import { assignmentMembers } from "@/lib/stats";
import { assignmentOptions } from "../data";
import AssignmentDetailClient from "./AssignmentDetailClient";

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await finalizeExpiredAttempts();
  const a = await prisma.assignment.findUnique({ where: { id }, include: { course: true, targets: { include: { user: true, group: true } } } });
  if (!a) notFound();
  const people = await assignmentMembers(a);
  return (
    <AssignmentDetailClient
      assignment={{
        id: a.id,
        courseId: a.courseId,
        course: a.course.title,
        deadline: a.deadline,
        groupIds: a.targets.flatMap((t) => (t.groupId ? [t.groupId] : [])),
        userIds: a.targets.flatMap((t) => (t.userId ? [t.userId] : [])),
        targetLabels: [...a.targets.flatMap((t) => (t.group ? [t.group.name] : [])), ...a.targets.flatMap((t) => (t.user ? [displayName(t.user)] : []))],
      }}
      people={people.map((p) => ({
        userId: p.userId,
        name: p.name,
        email: p.email,
        group: p.group,
        state: p.hasAccess ? p.state : p.state === "COMPLETED" ? "COMPLETED" : "NO_ACCESS",
        lessonsDone: p.progress.lessonsDone,
        lessonsTotal: p.progress.lessonsTotal,
        quizzesPassed: p.quizzesPassed,
        quizzesTotal: p.quizzesTotal,
        bestScore: p.bestScore,
        completedAt: p.progress.completedAt,
      }))}
      options={await assignmentOptions()}
    />
  );
}
