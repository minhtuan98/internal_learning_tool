"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { actionAdmin } from "@/lib/auth";
import { fail, type ActionResult } from "@/lib/types";
import { generateQuestions } from "@/lib/ai";
import { htmlToText } from "@/lib/sanitize";
import { finalizeExpiredAttempts } from "@/lib/quiz";

const quizPath = (q: { id: string; courseId: string }) => `/admin/courses/${q.courseId}/quizzes/${q.id}`;

// Grade expired attempts against their original questions before allowing edits.
// Live attempts must keep the question/answer set they started with.
async function questionsInUse(quizId: string) {
  await finalizeExpiredAttempts({ quizId });
  return (await prisma.attempt.count({ where: { quizId, status: "IN_PROGRESS", deadlineAt: { gt: new Date(Date.now() - 5_000) } } })) > 0;
}
const QUESTIONS_IN_USE = "Có thành viên đang làm quiz. Hãy chờ họ nộp bài trước khi sửa hoặc duyệt câu hỏi.";

async function checkSources(courseId: string, lessonIds: string[]) {
  if (lessonIds.length === 0) return "Chọn ít nhất 1 bài học làm nguồn câu hỏi.";
  const lessons = await prisma.lesson.findMany({ where: { id: { in: lessonIds }, courseId } });
  if (lessons.length !== lessonIds.length) return "Bài học nguồn phải thuộc khóa học này.";
  const noTranscript = lessons.find((l) => l.type === "VIDEO" && !l.transcript);
  if (noTranscript) return `Video "${noTranscript.title}" chưa có transcript nên không thể làm nguồn tạo câu hỏi.`;
  return null;
}

/** A quiz belongs to a course; questions come from selected lessons (DEC-025, DEC-026). */
export async function createQuiz(courseId: string, input: { title: string; lessonIds: string[] }): Promise<ActionResult<{ id: string }>> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  const title = input.title.trim();
  if (!title) return fail("Nhập tên quiz.");
  const err = await checkSources(courseId, input.lessonIds);
  if (err) return fail(err);
  const quiz = await prisma.quiz.create({
    data: { courseId, title, sources: { create: input.lessonIds.map((lessonId) => ({ lessonId })) } },
  });
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true, data: { id: quiz.id }, message: "Đã tạo quiz. Tiếp theo: tạo câu hỏi bằng AI." };
}

export async function updateQuizInfo(quizId: string, input: { title: string; lessonIds: string[] }): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return fail("Không tìm thấy quiz.");
  const title = input.title.trim();
  if (!title) return fail("Nhập tên quiz.");
  const err = await checkSources(quiz.courseId, input.lessonIds);
  if (err) return fail(err);
  await prisma.$transaction([
    prisma.quizSourceLesson.deleteMany({ where: { quizId } }),
    prisma.quiz.update({ where: { id: quizId }, data: { title, sources: { create: input.lessonIds.map((lessonId) => ({ lessonId })) } } }),
  ]);
  revalidatePath(quizPath(quiz));
  return { ok: true, message: "Đã lưu thông tin quiz." };
}

const SettingsSchema = z
  .object({
    passScore: z.number().int().min(1, "Điểm đạt từ 1 đến 100%.").max(100, "Điểm đạt từ 1 đến 100%."),
    timeLimitMinutes: z.number().int().min(1, "Thời gian làm bài tối thiểu 1 phút.").max(600),
    maxAttempts: z.number().int().min(1, "Số lượt tối thiểu là 1.").max(20),
    opensAt: z.string().refine((v) => !v || Number.isFinite(Date.parse(v)), "Thời điểm mở không hợp lệ.").nullable().optional(),
    closesAt: z.string().refine((v) => !v || Number.isFinite(Date.parse(v)), "Thời điểm đóng không hợp lệ.").nullable().optional(),
  })
  .refine((s) => !s.opensAt || !s.closesAt || new Date(s.closesAt) > new Date(s.opensAt), { message: "Thời điểm đóng phải sau thời điểm mở." });

/** Pass score, time limit, attempts, time window (DEC-016). Editable after publish (DEC-057). */
export async function saveQuizSettings(quizId: string, input: unknown): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  const p = SettingsSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message);
  const q = await prisma.quiz.update({
    where: { id: quizId },
    data: {
      passScore: p.data.passScore,
      timeLimitMinutes: p.data.timeLimitMinutes,
      maxAttempts: p.data.maxAttempts,
      opensAt: p.data.opensAt ? new Date(p.data.opensAt) : null,
      closesAt: p.data.closesAt ? new Date(p.data.closesAt) : null,
    },
  });
  revalidatePath(quizPath(q));
  return { ok: true, message: "Đã lưu cài đặt quiz." };
}

/** AI drafts questions from the selected lessons; they start as PENDING review (PRD scope 3-4). */
export async function generateQuizQuestions(quizId: string, count: number): Promise<ActionResult<{ created: number; mode: string }>> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  if (!Number.isFinite(count)) return fail("Số câu hỏi không hợp lệ.");
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { sources: { include: { lesson: true } } } });
  if (!quiz) return fail("Không tìm thấy quiz.");
  const n = Math.max(1, Math.min(20, Math.round(count)));
  const lessons = quiz.sources.map(({ lesson }) => ({
    title: lesson.title,
    text: lesson.type === "ARTICLE" ? htmlToText(lesson.articleBody ?? "") : lesson.transcript ?? "",
  }));
  if (lessons.every((l) => l.text.trim().length < 50)) return fail("Bài học nguồn chưa đủ nội dung để tạo câu hỏi.");
  const r = await generateQuestions(quizId, lessons, n);
  if (!r.ok) return r;
  const last = await prisma.question.aggregate({ where: { quizId }, _max: { position: true } });
  let pos = last._max.position ?? 0;
  await prisma.question.createMany({
    data: r.questions.map((q) => ({
      quizId,
      position: ++pos,
      text: q.text,
      options: JSON.stringify(q.options),
      correctIndex: q.correct_index,
      explanation: q.explanation,
      aiCallId: r.logId,
    })),
  });
  revalidatePath(quizPath(quiz));
  return {
    ok: true,
    data: { created: r.questions.length, mode: r.mode },
    message: r.mode === "sample" ? `Đã tạo ${r.questions.length} câu hỏi MẪU (chưa cấu hình ANTHROPIC_API_KEY). Hãy duyệt từng câu.` : `AI đã tạo ${r.questions.length} câu hỏi nháp. Hãy duyệt từng câu.`,
  };
}

const QuestionSchema = z.object({
  text: z.string().trim().min(5, "Câu hỏi quá ngắn."),
  options: z.array(z.string().trim().min(1, "Không để trống đáp án.")).length(4, "Mỗi câu cần đúng 4 đáp án."),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().optional().nullable(),
});

/** Admin edits a question. Any content change marks it "edited" for the AI quality measure (DEC-014). */
export async function updateQuestion(id: string, input: unknown, approve: boolean): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  const p = QuestionSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message);
  const q = await prisma.question.findUnique({ where: { id }, include: { quiz: true } });
  if (!q) return fail("Không tìm thấy câu hỏi.");
  const changed = q.text !== p.data.text || q.options !== JSON.stringify(p.data.options) || q.correctIndex !== p.data.correctIndex || (q.explanation ?? "") !== (p.data.explanation ?? "");
  if ((changed || (approve && q.reviewStatus !== "APPROVED")) && await questionsInUse(q.quiz.id)) return fail(QUESTIONS_IN_USE);
  await prisma.question.update({
    where: { id },
    data: {
      text: p.data.text,
      options: JSON.stringify(p.data.options),
      correctIndex: p.data.correctIndex,
      explanation: p.data.explanation ?? null,
      edited: q.edited || changed,
      reviewStatus: approve ? "APPROVED" : q.reviewStatus,
    },
  });
  revalidatePath(quizPath(q.quiz));
  return { ok: true, message: approve ? "Đã lưu và duyệt câu hỏi." : "Đã lưu câu hỏi." };
}

export async function reviewQuestion(id: string, status: "APPROVED" | "REJECTED" | "PENDING"): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) return fail("Trạng thái câu hỏi không hợp lệ.");
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) return fail("Không tìm thấy câu hỏi.");
  if (existing.reviewStatus !== status && await questionsInUse(existing.quizId)) return fail(QUESTIONS_IN_USE);
  const q = await prisma.question.update({ where: { id }, data: { reviewStatus: status }, include: { quiz: true } });
  if (q.quiz.status === "PUBLISHED" && status !== "APPROVED") {
    const left = await prisma.question.count({ where: { quizId: q.quizId, reviewStatus: "APPROVED" } });
    if (left === 0) {
      await prisma.question.update({ where: { id }, data: { reviewStatus: "APPROVED" } });
      return fail("Quiz đã xuất bản cần ít nhất 1 câu hỏi được duyệt.");
    }
  }
  revalidatePath(quizPath(q.quiz));
  const label = status === "APPROVED" ? "Đã duyệt câu hỏi." : status === "REJECTED" ? "Đã loại câu hỏi. Câu bị loại không hiển thị cho thành viên." : "Đã chuyển về chờ duyệt.";
  return { ok: true, message: label };
}

export async function approveAllPending(quizId: string): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  if (await questionsInUse(quizId)) return fail(QUESTIONS_IN_USE);
  const r = await prisma.question.updateMany({ where: { quizId, reviewStatus: "PENDING" }, data: { reviewStatus: "APPROVED" } });
  const q = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (q) revalidatePath(quizPath(q));
  return { ok: true, message: `Đã duyệt ${r.count} câu hỏi.` };
}

export async function setQuizStatus(quizId: string, status: "DRAFT" | "PUBLISHED"): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  if (status !== "DRAFT" && status !== "PUBLISHED") return fail("Trạng thái quiz không hợp lệ.");
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return fail("Không tìm thấy quiz.");
  if (status === "PUBLISHED") {
    const approved = await prisma.question.count({ where: { quizId, reviewStatus: "APPROVED" } });
    if (approved === 0) return fail("Cần ít nhất 1 câu hỏi đã duyệt để xuất bản quiz.");
  } else {
    const inProgress = await prisma.attempt.count({ where: { quizId, status: "IN_PROGRESS", deadlineAt: { gt: new Date() } } });
    if (inProgress > 0) return fail(`Có ${inProgress} thành viên đang làm quiz này. Hãy chờ họ nộp bài.`);
  }
  await prisma.quiz.update({ where: { id: quizId }, data: { status, publishedAt: status === "PUBLISHED" ? quiz.publishedAt ?? new Date() : quiz.publishedAt } });
  revalidatePath(quizPath(quiz));
  revalidatePath(`/admin/courses/${quiz.courseId}`);
  return { ok: true, message: status === "PUBLISHED" ? "Đã xuất bản quiz." : "Đã chuyển quiz về nháp." };
}

/** Anti-cheat: members see right/wrong per question only after an admin releases it (e.g. when the exam period ends). */
export async function setQuizReviewRelease(quizId: string, released: boolean): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return fail("Không tìm thấy quiz.");
  await prisma.quiz.update({ where: { id: quizId }, data: { reviewReleased: Boolean(released) } });
  revalidatePath(quizPath(quiz));
  return { ok: true, message: released ? "Đã mở cho thành viên xem đúng/sai từng câu." : "Đã khóa phần xem đúng/sai từng câu." };
}

export async function deleteQuiz(quizId: string): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  const attempts = await prisma.attempt.count({ where: { quizId } });
  if (attempts > 0) return fail("Quiz đã có lượt làm nên không thể xóa. Bạn có thể chuyển về nháp.");
  const q = await prisma.quiz.delete({ where: { id: quizId } });
  revalidatePath(`/admin/courses/${q.courseId}`);
  return { ok: true, message: "Đã xóa quiz." };
}
