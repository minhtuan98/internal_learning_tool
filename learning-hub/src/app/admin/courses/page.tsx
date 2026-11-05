import { prisma } from "@/lib/db";
import { usersWithAccess } from "@/lib/access";
import CoursesClient from "./CoursesClient";

export default async function CoursesPage() {
  const [courses, categories] = await Promise.all([
    prisma.course.findMany({
      include: { category: true, _count: { select: { lessons: true, quizzes: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  const rows = [];
  for (const c of courses) {
    rows.push({
      id: c.id,
      title: c.title,
      description: c.description,
      coverImage: c.coverImage,
      categoryId: c.categoryId,
      category: c.category.name,
      status: c.status,
      lessons: c._count.lessons,
      quizzes: c._count.quizzes,
      people: (await usersWithAccess(c.id)).size,
      updatedAt: c.updatedAt,
      updatedBy: c.updatedBy,
    });
  }
  return <CoursesClient rows={rows} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />;
}
