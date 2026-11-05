import { requireMember } from "@/lib/auth";
import { accessibleCourseIds, assignmentState, assignmentsForUser, progressForCourses } from "@/lib/access";
import { finalizeExpiredAttempts } from "@/lib/quiz";
import MyWorkClient from "./MyWorkClient";

/** F8 "Việc của tôi": courses assigned to me, sorted by deadline (PRD scope 11). */
export default async function MyWorkPage() {
  const user = await requireMember();
  await finalizeExpiredAttempts({ userId: user.id });
  const assignments = await assignmentsForUser(user);
  const accessible = new Set(await accessibleCourseIds(user));
  const progress = await progressForCourses(user.id, [...new Set(assignments.map((a) => a.courseId))]);
  const items = assignments.map((a) => {
    const p = progress.get(a.courseId)!;
    return {
      id: a.id,
      courseId: a.courseId,
      title: a.course.title,
      category: a.course.category.name,
      coverImage: a.course.coverImage,
      deadline: a.deadline,
      state: assignmentState(p, a.deadline),
      hasAccess: accessible.has(a.courseId),
      lessonsDone: p.lessonsDone,
      lessonsTotal: p.lessonsTotal,
      completedAt: p.completedAt,
      quizzes: p.quizzes.map((q) => ({ id: q.id, title: q.title, bestScore: q.bestScore, passed: q.passed, left: Math.max(0, q.maxAttempts - q.attemptsUsed), opensAt: q.opensAt })),
    };
  });
  return <MyWorkClient items={items} />;
}
