import { prisma } from "./db";
import { assignmentState, progressForCourses, type AssignmentState, type CourseProgress } from "./access";
import { displayName, pct } from "./format";
import { finalizeExpiredAttempts } from "./quiz";

type MemberLite = { id: string; email: string; fullName: string | null; groupId: string | null; group: { name: string } | null };

/** Which published courses each member can open (individual + group access). */
async function accessMap(members: MemberLite[]) {
  const rows = await prisma.courseAccess.findMany({ where: { course: { status: "PUBLISHED" } }, select: { courseId: true, userId: true, groupId: true } });
  const map = new Map<string, Set<string>>();
  for (const m of members) {
    map.set(m.id, new Set(rows.filter((r) => r.userId === m.id || (m.groupId && r.groupId === m.groupId)).map((r) => r.courseId)));
  }
  return map;
}

export type AssignmentMemberRow = {
  userId: string;
  name: string;
  email: string;
  group: string | null;
  state: AssignmentState;
  hasAccess: boolean;
  progress: CourseProgress;
  bestScore: number | null;
  quizzesPassed: number;
  quizzesTotal: number;
};

/** Per-member status for one assignment (DEC-055, DEC-059). */
export async function assignmentMembers(assignment: { id: string; courseId: string; deadline: Date }): Promise<AssignmentMemberRow[]> {
  const targets = await prisma.assignmentTarget.findMany({ where: { assignmentId: assignment.id } });
  const userIds = targets.flatMap((t) => (t.userId ? [t.userId] : []));
  const groupIds = targets.flatMap((t) => (t.groupId ? [t.groupId] : []));
  const members = await prisma.user.findMany({
    where: { role: "MEMBER", OR: [{ id: { in: userIds } }, { groupId: { in: groupIds } }] },
    include: { group: true },
    orderBy: { fullName: "asc" },
  });
  const access = await accessMap(members);
  const rows: AssignmentMemberRow[] = [];
  for (const m of members) {
    const p = (await progressForCourses(m.id, [assignment.courseId])).get(assignment.courseId)!;
    const scores = p.quizzes.map((q) => q.bestScore).filter((s): s is number => s !== null);
    rows.push({
      userId: m.id,
      name: displayName(m),
      email: m.email,
      group: m.group?.name ?? null,
      state: assignmentState(p, assignment.deadline),
      hasAccess: access.get(m.id)?.has(assignment.courseId) ?? false,
      progress: p,
      bestScore: scores.length ? Math.max(...scores) : null,
      quizzesPassed: p.quizzes.filter((q) => q.passed).length,
      quizzesTotal: p.quizzes.length,
    });
  }
  return rows;
}

export async function dashboardStats(filter: { courseId?: string; groupId?: string; days: number }) {
  await finalizeExpiredAttempts();
  const since = new Date(Date.now() - filter.days * 86_400_000);
  const members = await prisma.user.findMany({
    where: { role: "MEMBER", status: "ACTIVE", ...(filter.groupId ? { groupId: filter.groupId } : {}) },
    include: { group: true },
  });
  const memberIds = members.map((m) => m.id);
  const access = await accessMap(members);
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED", ...(filter.courseId ? { id: filter.courseId } : {}) },
    include: { lessons: { select: { id: true } } },
  });
  const courseIds = new Set(courses.map((c) => c.id));
  const progress = await prisma.lessonProgress.findMany({ where: { userId: { in: memberIds } }, select: { userId: true, lessonId: true } });
  const doneSet = new Set(progress.map((p) => `${p.userId}:${p.lessonId}`));

  // Lesson completion rate, overall and by group.
  const byGroup = new Map<string, { done: number; total: number }>();
  let done = 0;
  let total = 0;
  for (const m of members) {
    for (const c of courses) {
      if (!access.get(m.id)?.has(c.id)) continue;
      const t = c.lessons.length;
      const d = c.lessons.filter((l) => doneSet.has(`${m.id}:${l.id}`)).length;
      total += t;
      done += d;
      const g = m.group?.name ?? "Không có nhóm";
      const cur = byGroup.get(g) ?? { done: 0, total: 0 };
      byGroup.set(g, { done: cur.done + d, total: cur.total + t });
    }
  }

  // Quiz pass rate over submitted attempts in the period.
  const attempts = await prisma.attempt.findMany({
    where: { status: "SUBMITTED", submittedAt: { gte: since }, userId: { in: memberIds }, quiz: { courseId: { in: [...courseIds] } } },
    include: { quiz: { include: { course: true } } },
  });
  const passed = attempts.filter((a) => a.passed).length;
  const byQuiz = new Map<string, { title: string; course: string; total: number; passed: number; people: Set<string> }>();
  for (const a of attempts) {
    const cur = byQuiz.get(a.quizId) ?? { title: a.quiz.title, course: a.quiz.course.title, total: 0, passed: 0, people: new Set<string>() };
    cur.total++;
    if (a.passed) cur.passed++;
    cur.people.add(a.userId);
    byQuiz.set(a.quizId, cur);
  }

  // Members with overdue assigned courses.
  const assignments = await prisma.assignment.findMany({
    where: filter.courseId ? { courseId: filter.courseId } : {},
    include: { course: true },
  });
  const overdue: { key: string; userId: string; name: string; group: string | null; course: string; assignmentId: string; deadline: Date; lessonsDone: number; lessonsTotal: number }[] = [];
  for (const asg of assignments) {
    if (asg.deadline > new Date()) continue;
    for (const r of await assignmentMembers(asg)) {
      if (r.state !== "OVERDUE" || !memberIds.includes(r.userId)) continue;
      overdue.push({ key: `${asg.id}:${r.userId}`, userId: r.userId, name: r.name, group: r.group, course: asg.course.title, assignmentId: asg.id, deadline: asg.deadline, lessonsDone: r.progress.lessonsDone, lessonsTotal: r.progress.lessonsTotal });
    }
  }

  // AI question quality (DEC-014): approved without edits / edited / rejected.
  const questions = await prisma.question.findMany({
    where: { createdAt: { gte: since }, quiz: filter.courseId ? { courseId: filter.courseId } : undefined },
    select: { reviewStatus: true, edited: true },
  });
  const ai = {
    approvedClean: questions.filter((q) => q.reviewStatus === "APPROVED" && !q.edited).length,
    approvedEdited: questions.filter((q) => q.reviewStatus === "APPROVED" && q.edited).length,
    rejected: questions.filter((q) => q.reviewStatus === "REJECTED").length,
    pending: questions.filter((q) => q.reviewStatus === "PENDING").length,
  };
  const reviewed = ai.approvedClean + ai.approvedEdited + ai.rejected;

  return {
    completion: { rate: pct(done, total), done, total },
    passRate: { rate: pct(passed, attempts.length), passed, total: attempts.length },
    overdueMembers: new Set(overdue.map((o) => o.userId)).size,
    overdue: overdue.sort((a, b) => a.deadline.getTime() - b.deadline.getTime()),
    ai: { ...ai, cleanRate: pct(ai.approvedClean, reviewed), reviewed },
    byGroup: [...byGroup.entries()].map(([label, v]) => ({ label, value: pct(v.done, v.total), hint: `${v.done}/${v.total} bài` })).sort((a, b) => b.value - a.value),
    byQuiz: [...byQuiz.entries()].map(([id, v]) => ({ id, title: v.title, course: v.course, attempts: v.total, people: v.people.size, rate: pct(v.passed, v.total) })),
  };
}

/** "Kết quả quiz" tab: one row per member and quiz with attempts used and best score. */
export async function quizResults(filter: { courseId?: string; quizId?: string; groupId?: string }) {
  await finalizeExpiredAttempts();
  const attempts = await prisma.attempt.findMany({
    where: {
      status: "SUBMITTED",
      ...(filter.quizId ? { quizId: filter.quizId } : {}),
      quiz: filter.courseId ? { courseId: filter.courseId } : undefined,
      user: filter.groupId ? { groupId: filter.groupId } : undefined,
    },
    include: { user: { include: { group: true } }, quiz: { include: { course: true } } },
    orderBy: { submittedAt: "desc" },
  });
  const rows = new Map<string, { key: string; userId: string; name: string; email: string; group: string | null; quizId: string; quiz: string; course: string; used: number; max: number; best: number; passed: boolean; last: Date | null; attempts: { number: number; submittedAt: Date | null; startedAt: Date; score: number | null; passed: boolean | null; auto: boolean; voided: boolean; violations: number }[] }>();
  for (const a of attempts) {
    const key = `${a.userId}:${a.quizId}`;
    const cur = rows.get(key) ?? {
      key,
      userId: a.userId,
      name: displayName(a.user),
      email: a.user.email,
      group: a.user.group?.name ?? null,
      quizId: a.quizId,
      quiz: a.quiz.title,
      course: a.quiz.course.title,
      used: 0,
      max: a.quiz.maxAttempts,
      best: 0,
      passed: false,
      last: a.submittedAt,
      attempts: [],
    };
    cur.used++;
    cur.best = Math.max(cur.best, a.score ?? 0);
    cur.passed = cur.passed || Boolean(a.passed);
    cur.attempts.push({ number: a.number, submittedAt: a.submittedAt, startedAt: a.startedAt, score: a.score, passed: a.passed, auto: a.autoSubmitted, voided: a.voided, violations: a.violations });
    rows.set(key, cur);
  }
  return [...rows.values()];
}

/** "Tiến độ học bài" tab: one row per member and accessible course. */
export async function learningProgress(filter: { courseId?: string; groupId?: string }) {
  const members = await prisma.user.findMany({
    where: { role: "MEMBER", ...(filter.groupId ? { groupId: filter.groupId } : {}) },
    include: { group: true },
    orderBy: { fullName: "asc" },
  });
  const access = await accessMap(members);
  const courses = await prisma.course.findMany({ where: { status: "PUBLISHED", ...(filter.courseId ? { id: filter.courseId } : {}) } });
  const rows = [];
  for (const m of members) {
    const ids = courses.filter((c) => access.get(m.id)?.has(c.id)).map((c) => c.id);
    const prog = await progressForCourses(m.id, ids);
    for (const cid of ids) {
      const p = prog.get(cid)!;
      rows.push({
        key: `${m.id}:${cid}`,
        name: displayName(m),
        email: m.email,
        group: m.group?.name ?? null,
        status: m.status,
        course: courses.find((c) => c.id === cid)!.title,
        lessonsDone: p.lessonsDone,
        lessonsTotal: p.lessonsTotal,
        rate: pct(p.lessonsDone, p.lessonsTotal),
        lastActivity: p.lastActivity,
      });
    }
  }
  return rows;
}
