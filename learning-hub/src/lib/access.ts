import { prisma } from "./db";

type UserLike = { id: string; groupId: string | null };

/** Matches course_access / assignment_target rows for a member or their current group (DEC-022, DEC-033). */
export function targetWhere(user: UserLike) {
  return { OR: [{ userId: user.id }, ...(user.groupId ? [{ groupId: user.groupId }] : [])] };
}

/** A member can open a course when it is PUBLISHED and there is an access row for them or their group. */
export async function accessibleCourseIds(user: UserLike) {
  const rows = await prisma.courseAccess.findMany({
    where: { ...targetWhere(user), course: { status: "PUBLISHED" } },
    select: { courseId: true },
  });
  return [...new Set(rows.map((r) => r.courseId))];
}

export async function hasCourseAccess(user: UserLike, courseId: string) {
  const n = await prisma.courseAccess.count({
    where: { courseId, course: { status: "PUBLISHED" }, ...targetWhere(user) },
  });
  return n > 0;
}

/** Users who can open a course right now (individual + group access, active members only). */
export async function usersWithAccess(courseId: string) {
  const rows = await prisma.courseAccess.findMany({ where: { courseId }, select: { userId: true, groupId: true } });
  const groupIds = rows.flatMap((r) => (r.groupId ? [r.groupId] : []));
  const userIds = rows.flatMap((r) => (r.userId ? [r.userId] : []));
  const users = await prisma.user.findMany({
    where: { role: "MEMBER", OR: [{ id: { in: userIds } }, { groupId: { in: groupIds } }] },
    select: { id: true },
  });
  return new Set(users.map((u) => u.id));
}

export type CourseProgress = {
  lessonsTotal: number;
  lessonsDone: number;
  quizzes: { id: string; title: string; bestScore: number | null; passed: boolean; attemptsUsed: number; maxAttempts: number; opensAt: Date | null; closesAt: Date | null }[];
  complete: boolean;
  started: boolean;
  completedAt: Date | null;
  lastActivity: Date | null;
};

/** Progress of one member across several courses, in a fixed number of queries. */
export async function progressForCourses(userId: string, courseIds: string[]): Promise<Map<string, CourseProgress>> {
  const map = new Map<string, CourseProgress>();
  if (courseIds.length === 0) return map;
  const [lessons, done, quizzes, attempts] = await Promise.all([
    prisma.lesson.findMany({ where: { courseId: { in: courseIds } }, select: { id: true, courseId: true } }),
    prisma.lessonProgress.findMany({ where: { userId, lesson: { courseId: { in: courseIds } } }, select: { lessonId: true, completedAt: true, lesson: { select: { courseId: true } } } }),
    prisma.quiz.findMany({ where: { courseId: { in: courseIds }, status: "PUBLISHED" }, orderBy: { createdAt: "asc" } }),
    prisma.attempt.findMany({ where: { userId, quiz: { courseId: { in: courseIds } } }, select: { quizId: true, status: true, score: true, passed: true, submittedAt: true, startedAt: true } }),
  ]);
  for (const cid of courseIds) {
    const ls = lessons.filter((l) => l.courseId === cid);
    const ds = done.filter((d) => d.lesson.courseId === cid);
    const qs = quizzes.filter((q) => q.courseId === cid).map((q) => {
      const at = attempts.filter((a) => a.quizId === q.id);
      const sub = at.filter((a) => a.status === "SUBMITTED");
      const scores = sub.map((a) => a.score ?? 0);
      return {
        id: q.id,
        title: q.title,
        bestScore: scores.length ? Math.max(...scores) : null,
        passed: sub.some((a) => a.passed),
        attemptsUsed: at.length,
        maxAttempts: q.maxAttempts,
        opensAt: q.opensAt,
        closesAt: q.closesAt,
      };
    });
    const qIds = new Set(qs.map((q) => q.id));
    const myAttempts = attempts.filter((a) => qIds.has(a.quizId));
    const complete = ds.length >= ls.length && qs.every((q) => q.passed) && (ls.length > 0 || qs.length > 0);
    const times = [
      ...ds.map((d) => d.completedAt),
      ...myAttempts.map((a) => a.submittedAt ?? a.startedAt),
    ].sort((a, b) => b.getTime() - a.getTime());
    // Completion is when every requirement was first met. Later retakes are activity,
    // not a new completion date (which would change assignment/certificate history).
    const passTimes = qs.flatMap((q) => {
      const passes = myAttempts.filter((a) => a.quizId === q.id && a.status === "SUBMITTED" && a.passed && a.submittedAt);
      return passes.length ? [new Date(Math.min(...passes.map((a) => a.submittedAt!.getTime())))] : [];
    });
    const completionTimes = [...ds.map((d) => d.completedAt), ...passTimes].sort((a, b) => b.getTime() - a.getTime());
    map.set(cid, {
      lessonsTotal: ls.length,
      lessonsDone: ds.length,
      quizzes: qs,
      complete,
      started: ds.length > 0 || myAttempts.length > 0,
      completedAt: complete ? completionTimes[0] ?? null : null,
      lastActivity: times[0] ?? null,
    });
  }
  return map;
}

export async function courseProgress(userId: string, courseId: string) {
  return (await progressForCourses(userId, [courseId])).get(courseId)!;
}

export type AssignmentState = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";

/** Assignment status for one member. "Completed" = all lessons learned and every published quiz passed. */
export function assignmentState(p: CourseProgress, deadline: Date, now = new Date()): AssignmentState {
  if (p.complete && p.completedAt && p.completedAt <= deadline) return "COMPLETED";
  if (p.complete && !p.completedAt) return "COMPLETED";
  if (now > deadline) return p.complete ? "COMPLETED" : "OVERDUE";
  return p.started ? "IN_PROGRESS" : "NOT_STARTED";
}

/** All assignments that reach a member (directly or through their group). */
export async function assignmentsForUser(user: UserLike) {
  return prisma.assignment.findMany({
    where: { targets: { some: targetWhere(user) } },
    include: { course: { include: { category: true } } },
    orderBy: { deadline: "asc" },
  });
}

/**
 * DEC-059: after the deadline of an assignment, the member can no longer study or take quizzes
 * in that course (unless already completed, or another assignment of the same course is still open).
 */
export async function deadlineLock(user: UserLike, courseId: string, now = new Date()) {
  const asg = await prisma.assignment.findMany({
    where: { courseId, targets: { some: targetWhere(user) } },
    orderBy: { deadline: "desc" },
  });
  if (asg.length === 0) return { locked: false as const, deadline: null as Date | null, activeDeadline: null as Date | null };
  const open = asg.filter((a) => a.deadline > now).sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  if (open.length > 0) return { locked: false as const, deadline: null, activeDeadline: open[0].deadline };
  const p = await courseProgress(user.id, courseId);
  return { locked: !p.complete, deadline: asg[0].deadline, activeDeadline: null };
}
