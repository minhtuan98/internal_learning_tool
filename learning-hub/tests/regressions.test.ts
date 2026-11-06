import { describe, it, expect } from "vitest";
import { mocks } from "./setup";
import { saveAnswer } from "@/server/member-actions";
import { toEmbedUrl } from "@/lib/video";

// These are requirement-based regression checks, not expected failures.
// Keep red until production code meets the rule; never weaken these assertions to get green.
describe("F8 · Regression · Đáp án phải thuộc quiz và đúng kiểu", () => {
  function openAttempt() { mocks.db.attempt.findUnique.mockResolvedValue({ id: "a1", userId: "u1", quizId: "quiz1", status: "IN_PROGRESS", deadlineAt: new Date(Date.now() + 60_000) }); }
  it("không lưu câu hỏi thuộc quiz khác", async () => { openAttempt(); mocks.db.question.findUnique.mockResolvedValue({ id: "foreign", quizId: "quiz2", reviewStatus: "APPROVED" }); expect((await saveAnswer("a1", "foreign", 1)).ok).toBe(false); expect(mocks.db.answer.upsert).not.toHaveBeenCalled(); });
  it("không lưu chỉ số đáp án thập phân", async () => { openAttempt(); expect((await saveAnswer("a1", "q1", 1.5)).ok).toBe(false); expect(mocks.db.answer.upsert).not.toHaveBeenCalled(); });
});

describe("F4 · Regression · Video chỉ từ nhà cung cấp hợp lệ", () => {
  it("không chấp nhận hostname giả mạo YouTube", () => expect(toEmbedUrl("https://evilyoutube.com/watch?v=abc")).toBeNull());
});
