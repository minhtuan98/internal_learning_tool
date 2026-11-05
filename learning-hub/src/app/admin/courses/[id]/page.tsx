import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { displayName } from "@/lib/format";
import CourseDetailClient from "./CourseDetailClient";

export default async function CourseDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      category: true,
      lessons: { orderBy: { position: "asc" } },
      quizzes: {
        orderBy: { createdAt: "asc" },
        include: { questions: { select: { reviewStatus: true } }, attempts: { select: { userId: true } } },
      },
      access: true,
    },
  });
  if (!course) notFound();
  const [members, groups, categories] = await Promise.all([
    prisma.user.findMany({ where: { role: "MEMBER" }, include: { group: true }, orderBy: { fullName: "asc" } }),
    prisma.group.findMany({ include: { _count: { select: { users: true } } }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <CourseDetailClient
      tab={tab ?? "lessons"}
      course={{
        id: course.id,
        title: course.title,
        description: course.description,
        coverImage: course.coverImage,
        categoryId: course.categoryId,
        category: course.category.name,
        status: course.status,
        updatedAt: course.updatedAt,
        updatedBy: course.updatedBy,
      }}
      lessons={course.lessons.map((l) => ({ id: l.id, title: l.title, type: l.type, hasTranscript: Boolean(l.transcript), durationMinutes: l.durationMinutes }))}
      quizzes={course.quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        status: q.status,
        approved: q.questions.filter((x) => x.reviewStatus === "APPROVED").length,
        pending: q.questions.filter((x) => x.reviewStatus === "PENDING").length,
        passScore: q.passScore,
        timeLimitMinutes: q.timeLimitMinutes,
        maxAttempts: q.maxAttempts,
        opensAt: q.opensAt,
        closesAt: q.closesAt,
        people: new Set(q.attempts.map((a) => a.userId)).size,
      }))}
      access={{ userIds: course.access.flatMap((a) => (a.userId ? [a.userId] : [])), groupIds: course.access.flatMap((a) => (a.groupId ? [a.groupId] : [])) }}
      members={members.map((m) => ({ id: m.id, name: displayName(m), email: m.email, groupId: m.groupId, group: m.group?.name ?? null, status: m.status }))}
      groups={groups.map((g) => ({ id: g.id, name: g.name, count: g._count.users }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
