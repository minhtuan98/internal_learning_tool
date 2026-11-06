import { describe, it, expect, vi } from "vitest";
import { mocks } from "./setup";
vi.mock("@/lib/access", () => ({ hasCourseAccess: vi.fn(), deadlineLock: vi.fn() }));
vi.mock("@/lib/quiz", () => ({ checkCanStart: vi.fn(), finalizeAttempt: vi.fn() }));
vi.mock("@/lib/certificates", () => ({ issueCertificates: vi.fn().mockResolvedValue(0) }));
import { hasCourseAccess, deadlineLock } from "@/lib/access";
import { checkCanStart } from "@/lib/quiz";
import { completeLesson, startAttempt, saveAnswer, submitAttempt } from "@/server/member-actions";

describe("F6 · Học bài", () => {
  it("không đánh dấu bài ngoài quyền truy cập", async () => { mocks.db.lesson.findUnique.mockResolvedValue({ courseId: "c1" }); vi.mocked(hasCourseAccess).mockResolvedValue(false); expect((await completeLesson("l1")).ok).toBe(false); expect(mocks.db.lessonProgress.upsert).not.toHaveBeenCalled(); });
  it("không đánh dấu bài khi quá hạn", async () => { mocks.db.lesson.findUnique.mockResolvedValue({ courseId: "c1" }); vi.mocked(hasCourseAccess).mockResolvedValue(true); vi.mocked(deadlineLock).mockResolvedValue({ locked: true, deadline: new Date(), activeDeadline: null }); expect((await completeLesson("l1")).ok).toBe(false); });
  it("học xong dùng upsert để không trùng tiến độ", async () => { mocks.db.lesson.findUnique.mockResolvedValue({ courseId: "c1" }); vi.mocked(hasCourseAccess).mockResolvedValue(true); vi.mocked(deadlineLock).mockResolvedValue({ locked: false, deadline: null, activeDeadline: null }); expect((await completeLesson("l1")).ok).toBe(true); expect(mocks.db.lessonProgress.upsert).toHaveBeenCalledWith({ where: { userId_lessonId: { userId: "u1", lessonId: "l1" } }, create: { userId: "u1", lessonId: "l1" }, update: {} }); });
});

describe("F8 · Làm bài và lưu đáp án", () => {
  it("resume không tạo lượt mới", async () => { vi.mocked(checkCanStart).mockResolvedValue({ ok: true, inProgressId: "a1", attemptsUsed: 1, deadlineCap: null }); expect(await startAttempt("q1")).toMatchObject({ data: { attemptId: "a1" } }); expect(mocks.db.attempt.create).not.toHaveBeenCalled(); });
  it("giới hạn giờ làm theo hạn giao bài", async () => { const cap = new Date(Date.now() + 60_000); vi.mocked(checkCanStart).mockResolvedValue({ ok: true, inProgressId: null, attemptsUsed: 0, deadlineCap: cap }); mocks.db.quiz.findUniqueOrThrow.mockResolvedValue({ timeLimitMinutes: 30 }); await startAttempt("q1"); expect(mocks.db.attempt.create).toHaveBeenCalledWith({ data: expect.objectContaining({ deadlineAt: cap, number: 1 }) }); });
  it("không lưu đáp án của người khác", async () => { mocks.db.attempt.findUnique.mockResolvedValue({ userId: "other" }); expect((await saveAnswer("a1", "q1", 0)).ok).toBe(false); });
  it("không nộp bài của người khác", async () => { mocks.db.attempt.findUnique.mockResolvedValue({ userId: "other" }); expect((await submitAttempt("a1")).ok).toBe(false); });
  it("không lưu đáp án sau thời gian ân hạn", async () => { mocks.db.attempt.findUnique.mockResolvedValue({ userId: "u1", status: "IN_PROGRESS", deadlineAt: new Date(Date.now() - 10_000) }); expect((await saveAnswer("a1", "q1", 0)).ok).toBe(false); });
  it.each([-1, 4])("từ chối đáp án ngoài 0..3: %s", async (value) => { mocks.db.attempt.findUnique.mockResolvedValue({ userId: "u1", status: "IN_PROGRESS", deadlineAt: new Date(Date.now() + 60_000) }); expect((await saveAnswer("a1", "q1", value)).ok).toBe(false); });
  it("lưu đáp án hợp lệ bằng upsert", async () => { mocks.db.attempt.findUnique.mockResolvedValue({ userId: "u1", quizId: "quiz1", status: "IN_PROGRESS", deadlineAt: new Date(Date.now() + 60_000) }); mocks.db.question.findUnique.mockResolvedValue({ quizId: "quiz1", reviewStatus: "APPROVED" }); expect((await saveAnswer("a1", "q1", 2)).ok).toBe(true); expect(mocks.db.answer.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { attemptId: "a1", questionId: "q1", selectedIndex: 2 } })); });
});
