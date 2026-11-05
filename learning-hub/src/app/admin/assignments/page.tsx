import { prisma } from "@/lib/db";
import { displayName } from "@/lib/format";
import { finalizeExpiredAttempts } from "@/lib/quiz";
import { assignmentMembers } from "@/lib/stats";
import { assignmentOptions } from "./data";
import AssignmentsClient from "./AssignmentsClient";

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ tab?: string; course?: string }> }) {
  const sp = await searchParams;
  await finalizeExpiredAttempts();
  const list = await prisma.assignment.findMany({
    include: { course: { include: { category: true } }, targets: { include: { user: true, group: true } } },
    orderBy: { deadline: "asc" },
  });
  const rows = [];
  for (const a of list) {
    const people = await assignmentMembers(a);
    rows.push({
      id: a.id,
      courseId: a.courseId,
      course: a.course.title,
      category: a.course.category.name,
      coverImage: a.course.coverImage,
      deadline: a.deadline,
      groupIds: a.targets.flatMap((t) => (t.groupId ? [t.groupId] : [])),
      userIds: a.targets.flatMap((t) => (t.userId ? [t.userId] : [])),
      targetLabels: [...a.targets.flatMap((t) => (t.group ? [t.group.name] : [])), ...a.targets.flatMap((t) => (t.user ? [displayName(t.user)] : []))],
      total: people.length,
      completed: people.filter((p) => p.state === "COMPLETED").length,
      overdue: people.filter((p) => p.state === "OVERDUE").length,
      noAccess: people.filter((p) => !p.hasAccess).length,
    });
  }
  return <AssignmentsClient rows={rows} options={await assignmentOptions()} initialTab={sp.tab ?? "all"} courseFilter={sp.course ?? null} />;
}
