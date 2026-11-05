import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import LessonEditor from "./LessonEditor";

export default async function LessonPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) notFound();
  if (lessonId === "new-article" || lessonId === "new-video") {
    return <LessonEditor course={{ id, title: course.title }} lesson={null} type={lessonId === "new-article" ? "ARTICLE" : "VIDEO"} />;
  }
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.courseId !== id) notFound();
  return (
    <LessonEditor
      course={{ id, title: course.title }}
      type={lesson.type as "ARTICLE" | "VIDEO"}
      lesson={{ id: lesson.id, title: lesson.title, articleBody: lesson.articleBody ?? "", videoUrl: lesson.videoUrl ?? "", transcript: lesson.transcript ?? "", durationMinutes: lesson.durationMinutes }}
    />
  );
}
