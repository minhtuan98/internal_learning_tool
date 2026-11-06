import { describe, it, expect, vi } from "vitest";
import { mocks } from "./setup";
vi.mock("@/lib/quiz", () => ({ finalizeExpiredAttempts: vi.fn() }));
import { dashboardStats, quizResults, learningProgress } from "@/lib/stats";

describe("F9 · Báo cáo và dashboard", () => {
  it("dữ liệu rỗng trả tỷ lệ 0 thay vì NaN", async () => { const s = await dashboardStats({ days: 30 }); expect(s.completion.rate).toBe(0); expect(s.passRate.rate).toBe(0); expect(s.overdueMembers).toBe(0); expect(s.ai.cleanRate).toBe(0); });
  it("AI quality tách duyệt nguyên bản, chỉnh sửa, loại và chờ", async () => { mocks.db.question.findMany.mockResolvedValue([{ reviewStatus: "APPROVED", edited: false }, { reviewStatus: "APPROVED", edited: true }, { reviewStatus: "REJECTED", edited: false }, { reviewStatus: "PENDING", edited: false }]); const { ai } = await dashboardStats({ days: 30 }); expect(ai).toEqual({ approvedClean: 1, approvedEdited: 1, rejected: 1, pending: 1, reviewed: 3, cleanRate: 33 }); });
  it("kết quả gộp theo người và quiz, lấy điểm cao nhất", async () => {
    const base = { userId: "u1", quizId: "q1", user: { email: "u@example.test", fullName: "User", group: { name: "HR" } }, quiz: { title: "Quiz", maxAttempts: 3, course: { title: "Course" } }, startedAt: new Date(), submittedAt: new Date(), autoSubmitted: false };
    mocks.db.attempt.findMany.mockResolvedValue([{ ...base, number: 2, score: 90, passed: true }, { ...base, number: 1, score: 40, passed: false }]);
    const rows = await quizResults({}); expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ used: 2, best: 90, passed: true, group: "HR" });
  });
  it("bộ lọc kết quả được đưa vào truy vấn", async () => { await quizResults({ courseId: "c1", quizId: "q1", groupId: "g1" }); expect(mocks.db.attempt.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "SUBMITTED", quizId: "q1", quiz: { courseId: "c1" }, user: { groupId: "g1" } }) })); });
  it("không có member thì tiến độ rỗng", async () => expect(await learningProgress({})).toEqual([]));
});
