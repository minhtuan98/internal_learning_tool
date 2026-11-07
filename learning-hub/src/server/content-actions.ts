"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { actionAdmin } from "@/lib/auth";
import { fail, type ActionResult } from "@/lib/types";
import { sanitizeArticle } from "@/lib/sanitize";
import { toEmbedUrl } from "@/lib/video";

const CourseSchema = z.object({
  title: z.string().trim().min(1, "Nhập tên khóa học."),
  description: z.string().trim().min(1, "Nhập mô tả."),
  coverImage: z.string().min(1, "Tải ảnh bìa lên."),
  categoryId: z.string().min(1, "Chọn danh mục."),
});

/** Create / edit a course; all four fields are required (DEC-038, DEC-041, DEC-043). */
export async function saveCourse(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await actionAdmin();
  if (!admin) return fail("Bạn không có quyền thực hiện thao tác này.");
  const p = CourseSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message);
  const dup = await prisma.course.findFirst({ where: { title: p.data.title, NOT: id ? { id } : undefined } });
  if (dup) return fail("Đã có khóa học cùng tên.");
  const data = { ...p.data, updatedBy: admin.fullName ?? admin.email };
  const course = id ? await prisma.course.update({ where: { id }, data }) : await prisma.course.create({ data });
  revalidatePath("/admin/courses");
  return { ok: true, data: { id: course.id }, message: id ? "Đã lưu khóa học." : "Đã tạo khóa học ở trạng thái Bản nháp." };
}

/** Publish / move back to draft (DEC-037, DEC-042). */
export async function setCourseStatus(id: string, status: "DRAFT" | "PUBLISHED"): Promise<ActionResult> {
  const admin = await actionAdmin();
  if (!admin) return fail("Bạn không có quyền thực hiện thao tác này.");
  if (status !== "DRAFT" && status !== "PUBLISHED") return fail("Trạng thái khóa học không hợp lệ.");
  if (status === "DRAFT") {
    const inProgress = await prisma.attempt.count({ where: { status: "IN_PROGRESS", quiz: { courseId: id }, deadlineAt: { gt: new Date() } } });
    if (inProgress > 0) return fail(`Có ${inProgress} thành viên đang làm quiz trong khóa này. Hãy chờ họ nộp bài rồi chuyển về nháp.`);
  } else {
    const lessons = await prisma.lesson.count({ where: { courseId: id } });
    if (lessons === 0) return fail("Khóa học cần ít nhất 1 bài học trước khi xuất bản.");
  }
  await prisma.course.update({ where: { id }, data: { status, updatedBy: admin.fullName ?? admin.email } });
  revalidatePath(`/admin/courses/${id}`);
  revalidatePath("/admin/courses");
  return { ok: true, message: status === "PUBLISHED" ? "Đã xuất bản. Thành viên có quyền truy cập sẽ thấy khóa học." : "Đã chuyển về Bản nháp. Thành viên không còn thấy khóa học." };
}

/** Delete only a draft course that nobody has attempted (DEC-046). */
export async function deleteCourse(id: string): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) return fail("Không tìm thấy khóa học.");
  if (course.status !== "DRAFT") return fail("Chỉ xóa được khóa học ở trạng thái Bản nháp.");
  const attempts = await prisma.attempt.count({ where: { quiz: { courseId: id } } });
  if (attempts > 0) return fail("Khóa học đã có người làm quiz nên không thể xóa, chỉ có thể để ở Bản nháp.");
  await prisma.course.delete({ where: { id } });
  revalidatePath("/admin/courses");
  return { ok: true, message: "Đã xóa khóa học." };
}

const LessonSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ARTICLE"), title: z.string().trim().min(1, "Nhập tên bài học."), articleBody: z.string().min(1, "Bài viết chưa có nội dung."), durationMinutes: z.number().int().positive().optional().nullable() }),
  z.object({
    type: z.literal("VIDEO"),
    title: z.string().trim().min(1, "Nhập tên bài học."),
    videoUrl: z.string().trim().min(1, "Dán link video."),
    transcript: z.string().optional().nullable(),
    durationMinutes: z.number().int().positive().optional().nullable(),
  }),
]);

export async function saveLesson(courseId: string, id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  const p = LessonSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message);
  const d = p.data;
  if (id) {
    const existing = await prisma.lesson.findUnique({ where: { id } });
    if (!existing || existing.courseId !== courseId) return fail("Bài học không thuộc khóa học này.");
  }
  const dup = await prisma.lesson.findFirst({ where: { courseId, title: d.title, NOT: id ? { id } : undefined } });
  if (dup) return fail("Trong khóa đã có bài học cùng tên."); // DEC-052
  let data;
  if (d.type === "ARTICLE") {
    const html = sanitizeArticle(d.articleBody);
    if (!html.replace(/<[^>]+>/g, "").trim() && !html.includes("<img")) return fail("Bài viết chưa có nội dung.");
    data = { type: d.type, title: d.title, articleBody: html, videoUrl: null, transcript: null, durationMinutes: d.durationMinutes ?? null };
  } else {
    if (!toEmbedUrl(d.videoUrl)) return fail("Link video phải là YouTube hoặc Google Drive.");
    data = { type: d.type, title: d.title, articleBody: null, videoUrl: d.videoUrl, transcript: d.transcript?.trim() || null, durationMinutes: d.durationMinutes ?? null };
  }
  let lessonId = id;
  if (id) await prisma.lesson.update({ where: { id, courseId }, data });
  else {
    const last = await prisma.lesson.aggregate({ where: { courseId }, _max: { position: true } });
    lessonId = (await prisma.lesson.create({ data: { ...data, courseId, position: (last._max.position ?? 0) + 1 } })).id;
  }
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true, data: { id: lessonId! }, message: "Đã lưu bài học." };
}

export async function deleteLesson(id: string): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  const l = await prisma.lesson.delete({ where: { id } });
  revalidatePath(`/admin/courses/${l.courseId}`);
  return { ok: true, message: "Đã xóa bài học." };
}

export async function reorderLessons(courseId: string, orderedIds: string[]): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  await prisma.$transaction(orderedIds.map((id, i) => prisma.lesson.update({ where: { id, courseId }, data: { position: i + 1 } })));
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true };
}

/**
 * Automatic transcript (Release 2, DEC-050). The fetching method is still open (HLD-Q7),
 * so this reports a clear error and the admin can paste the transcript by hand.
 */
export async function fetchTranscript(_lessonId: string): Promise<ActionResult<{ transcript: string }>> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  return fail("Không lấy được transcript cho video này: cách lấy tự động cho video riêng tư chưa được cấu hình (HLD-Q7). Hãy dán transcript thủ công.");
}

/** Replace the access list of a course with the given members and groups (DEC-021, DEC-022, DEC-049). */
export async function setCourseAccess(courseId: string, userIds: string[], groupIds: string[]): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  await prisma.$transaction([
    prisma.courseAccess.deleteMany({ where: { courseId } }),
    prisma.courseAccess.createMany({
      data: [...userIds.map((userId) => ({ courseId, userId })), ...groupIds.map((groupId) => ({ courseId, groupId }))],
    }),
  ]);
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true, message: "Đã cập nhật quyền truy cập. Ai đang làm quiz dở vẫn được nộp bài." };
}
