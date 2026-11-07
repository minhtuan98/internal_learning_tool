import { describe, it, expect, vi } from "vitest";
import { mocks } from "./setup";
vi.mock("@/lib/ai", () => ({ generateQuestions: vi.fn() }));
import { generateQuestions } from "@/lib/ai";
import { createQuiz, saveQuizSettings, updateQuestion, reviewQuestion, setQuizStatus, deleteQuiz, generateQuizQuestions } from "@/server/quiz-actions";

describe("F5 · Tạo và xuất bản quiz · DEC-025/026/057", () => {
  it("bắt buộc tiêu đề", async () => expect((await createQuiz("c1", { title: " ", lessonIds: ["l1"] })).ok).toBe(false));
  it("bắt buộc bài học nguồn", async () => expect((await createQuiz("c1", { title: "Quiz", lessonIds: [] })).ok).toBe(false));
  it("bài nguồn phải thuộc cùng khóa học", async () => expect((await createQuiz("c1", { title: "Quiz", lessonIds: ["foreign"] })).ok).toBe(false));
  it("video thiếu transcript không làm nguồn", async () => { mocks.db.lesson.findMany.mockResolvedValue([{ id: "l1", type: "VIDEO", title: "Video", transcript: null }]); expect((await createQuiz("c1", { title: "Quiz", lessonIds: ["l1"] })).ok).toBe(false); });
  it("tạo quiz từ bài nguồn hợp lệ", async () => { mocks.db.lesson.findMany.mockResolvedValue([{ id: "l1", type: "ARTICLE" }]); expect((await createQuiz("c1", { title: " Quiz ", lessonIds: ["l1"] })).ok).toBe(true); expect(mocks.db.quiz.create).toHaveBeenCalledWith({ data: { courseId: "c1", title: "Quiz", sources: { create: [{ lessonId: "l1" }] } } }); });
  const settings = { passScore: 70, timeLimitMinutes: 30, maxAttempts: 3 };
  it.each([{ passScore: 0 }, { passScore: 101 }, { timeLimitMinutes: 0 }, { maxAttempts: 21 }, { opensAt: "2026-11-07", closesAt: "2026-11-06" }])("kiểm tra giới hạn cài đặt %#", async (change) => expect((await saveQuizSettings("q1", { ...settings, ...change })).ok).toBe(false));
  it("lưu cài đặt hợp lệ", async () => expect((await saveQuizSettings("q1", settings)).ok).toBe(true));
  it("không xuất bản khi chưa có câu được duyệt", async () => { mocks.db.quiz.findUnique.mockResolvedValue({ id: "q1" }); expect((await setQuizStatus("q1", "PUBLISHED")).ok).toBe(false); });
  it("không về nháp khi đang có lượt làm", async () => { mocks.db.quiz.findUnique.mockResolvedValue({ id: "q1" }); mocks.db.attempt.count.mockResolvedValue(1); expect((await setQuizStatus("q1", "DRAFT")).ok).toBe(false); });
  it("không xóa quiz có lượt làm", async () => { mocks.db.attempt.count.mockResolvedValue(1); expect((await deleteQuiz("q1")).ok).toBe(false); expect(mocks.db.quiz.delete).not.toHaveBeenCalled(); });
});

describe("F5 · Duyệt câu hỏi AI · DEC-014", () => {
  const q = { text: "Câu hỏi nào đúng?", options: ["A", "B", "C", "D"], correctIndex: 1, explanation: "Vì B" };
  it("bắt buộc đúng 4 đáp án", async () => expect((await updateQuestion("q1", { ...q, options: ["A"] }, true)).ok).toBe(false));
  it("sửa nội dung đặt cờ edited và duyệt", async () => { mocks.db.question.findUnique.mockResolvedValue({ ...q, options: JSON.stringify(q.options), edited: false, quiz: { id: "quiz1", courseId: "c1" } }); await updateQuestion("q1", { ...q, text: "Câu hỏi đã sửa?" }, true); expect(mocks.db.question.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ edited: true, reviewStatus: "APPROVED" }) })); });
  it("duyệt nguyên văn giữ cờ edited=false", async () => { mocks.db.question.findUnique.mockResolvedValue({ ...q, options: JSON.stringify(q.options), edited: false, quiz: { id: "quiz1", courseId: "c1" } }); await updateQuestion("q1", q, true); expect(mocks.db.question.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ edited: false }) })); });
  it("không loại câu duyệt cuối cùng của quiz đã xuất bản", async () => { mocks.db.question.findUnique.mockResolvedValue({ id: "q1", quizId: "quiz1", reviewStatus: "APPROVED" }); mocks.db.question.update.mockResolvedValue({ quizId: "quiz1", quiz: { id: "quiz1", courseId: "c1", status: "PUBLISHED" } }); expect((await reviewQuestion("q1", "REJECTED")).ok).toBe(false); expect(mocks.db.question.update).toHaveBeenLastCalledWith({ where: { id: "q1" }, data: { reviewStatus: "APPROVED" } }); });
  it("nguồn quá ngắn không gọi AI", async () => { mocks.db.quiz.findUnique.mockResolvedValue({ sources: [{ lesson: { type: "ARTICLE", articleBody: "<p>Short</p>" } }] }); expect((await generateQuizQuestions("q1", 5)).ok).toBe(false); expect(generateQuestions).not.toHaveBeenCalled(); });
  it("lỗi AI không lưu câu hỏi", async () => { mocks.db.quiz.findUnique.mockResolvedValue({ sources: [{ lesson: { title: "Article", type: "ARTICLE", articleBody: "<p>" + "Lesson content. ".repeat(10) + "</p>" } }] }); vi.mocked(generateQuestions).mockResolvedValue({ ok: false, error: "API unavailable" }); expect(await generateQuizQuestions("q1", 5)).toEqual({ ok: false, error: "API unavailable" }); expect(mocks.db.question.createMany).not.toHaveBeenCalled(); });
});
