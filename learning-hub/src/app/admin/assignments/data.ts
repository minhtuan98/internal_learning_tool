import { prisma } from "@/lib/db";
import { displayName } from "@/lib/format";

/** Options for the assignment drawer: published courses, members, groups. */
export async function assignmentOptions() {
  const [courses, members, groups] = await Promise.all([
    prisma.course.findMany({ where: { status: "PUBLISHED" }, include: { _count: { select: { lessons: true, quizzes: { where: { status: "PUBLISHED" } } } } }, orderBy: { title: "asc" } }),
    prisma.user.findMany({ where: { role: "MEMBER", status: "ACTIVE" }, include: { group: true }, orderBy: { fullName: "asc" } }),
    prisma.group.findMany({ include: { _count: { select: { users: true } } }, orderBy: { name: "asc" } }),
  ]);
  return {
    courses: courses.map((c) => ({ id: c.id, title: c.title, lessons: c._count.lessons, quizzes: c._count.quizzes })),
    members: members.map((m) => ({ id: m.id, name: displayName(m), email: m.email, group: m.group?.name ?? null })),
    groups: groups.map((g) => ({ id: g.id, name: g.name, count: g._count.users })),
  };
}
