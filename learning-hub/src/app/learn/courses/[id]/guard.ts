import { prisma } from "@/lib/db";
import { deadlineLock, hasCourseAccess, targetWhere } from "@/lib/access";
import type { CurrentUser } from "@/lib/auth";

/** Access + deadline lock for a member opening a course. */
export async function courseGuard(user: CurrentUser, courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, include: { category: true } });
  if (!course || !(await hasCourseAccess(user, courseId))) {
    const asg = course ? await prisma.assignment.findFirst({ where: { courseId, targets: { some: targetWhere(user) } }, orderBy: { deadline: "desc" } }) : null;
    return { ok: false as const, assigned: course && asg && course.status === "PUBLISHED" ? { course: course.title, deadline: asg.deadline } : null };
  }
  const lock = await deadlineLock(user, courseId);
  return { ok: true as const, course, lock };
}
