import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import NoAccess from "@/components/NoAccess";
import { courseGuard } from "../../guard";
import LessonView from "./LessonView";

export default async function LessonPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  const user = await requireMember();
  const g = await courseGuard(user, id);
  if (!g.ok) return <NoAccess assigned={g.assigned} />;
  if (g.lock.locked) redirect(`/learn/courses/${id}`);
  const lessons = await prisma.lesson.findMany({ where: { courseId: id }, orderBy: { position: "asc" } });
  const idx = lessons.findIndex((l) => l.id === lessonId);
  if (idx < 0) notFound();
  const l = lessons[idx];
  const done = await prisma.lessonProgress.findMany({ where: { userId: user.id, lesson: { courseId: id } }, select: { lessonId: true } });
  return (
    <LessonView
      course={{ id, title: g.course.title }}
      lesson={{ id: l.id, title: l.title, type: l.type, articleBody: l.articleBody, videoUrl: l.videoUrl, durationMinutes: l.durationMinutes }}
      outline={lessons.map((x) => ({ id: x.id, title: x.title, type: x.type, done: done.some((d) => d.lessonId === x.id) }))}
      prevId={lessons[idx - 1]?.id ?? null}
      nextId={lessons[idx + 1]?.id ?? null}
    />
  );
}
