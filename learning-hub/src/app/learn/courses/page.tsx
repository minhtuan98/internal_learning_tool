import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { accessibleCourseIds, progressForCourses } from "@/lib/access";
import MyCoursesClient from "./MyCoursesClient";

export default async function MyCoursesPage() {
  const user = await requireMember();
  const ids = await accessibleCourseIds(user);
  const [courses, progress, categories] = await Promise.all([
    prisma.course.findMany({ where: { id: { in: ids } }, include: { category: true, lessons: { orderBy: { position: "asc" } }, _count: { select: { quizzes: { where: { status: "PUBLISHED" } } } } }, orderBy: { title: "asc" } }),
    progressForCourses(user.id, ids),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  const done = await prisma.lessonProgress.findMany({ where: { userId: user.id }, select: { lessonId: true } });
  const doneIds = new Set(done.map((d) => d.lessonId));
  const deadlines = await prisma.assignment.findMany({
    where: { courseId: { in: ids }, targets: { some: { OR: [{ userId: user.id }, ...(user.groupId ? [{ groupId: user.groupId }] : [])] } } },
    orderBy: { deadline: "asc" },
  });
  const cards = courses.map((c) => {
    const p = progress.get(c.id)!;
    const next = c.lessons.find((l) => !doneIds.has(l.id));
    const dl = deadlines.filter((d) => d.courseId === c.id);
    const open = dl.find((d) => d.deadline > new Date());
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      categoryId: c.categoryId,
      category: c.category.name,
      coverImage: c.coverImage,
      lessonsTotal: p.lessonsTotal,
      lessonsDone: p.lessonsDone,
      quizzes: c._count.quizzes,
      lastActivity: p.lastActivity,
      nextLesson: next ? { id: next.id, title: next.title, position: next.position, minutes: next.durationMinutes, type: next.type } : null,
      deadline: open?.deadline ?? dl[dl.length - 1]?.deadline ?? null,
      complete: p.complete,
    };
  });
  return <MyCoursesClient name={user.fullName ?? user.email} cards={cards} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />;
}
