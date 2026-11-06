import { describe, it, expect, vi } from "vitest";
import { mocks } from "./setup";
vi.mock("@/lib/certificates", () => ({ issueCertificates: vi.fn().mockResolvedValue(0) }));
vi.mock("@/lib/access", () => ({ hasCourseAccess: vi.fn(), deadlineLock: vi.fn() }));
import { hasCourseAccess, deadlineLock } from "@/lib/access";
import { issueCertificates } from "@/lib/certificates";
import { finalizeAttempt, checkCanStart } from "@/lib/quiz";

describe("F8 · Chấm điểm quiz bằng code", () => {
  function attempt(passScore = 50) {
    return { id: "a1", userId: "u1", status: "IN_PROGRESS", deadlineAt: new Date(Date.now() - 60_000), quiz: { courseId: "c1", passScore, questions: [{ id: "q1", correctIndex: 1 }, { id: "q2", correctIndex: 2 }] }, answers: [{ id: "ans1", questionId: "q1", selectedIndex: 1 }] };
  }
  it("câu chưa trả lời tính sai và đạt tại đúng ngưỡng", async () => {
    mocks.db.attempt.findUnique.mockResolvedValueOnce(attempt());
    await finalizeAttempt("a1");
    expect(mocks.db.attempt.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ score: 50, correctCount: 1, totalCount: 2, passed: true, status: "SUBMITTED" }) }));
    expect(issueCertificates).toHaveBeenCalledWith("u1", ["c1"]);
  });
  it("dưới ngưỡng không đạt", async () => { mocks.db.attempt.findUnique.mockResolvedValueOnce(attempt(80)); await finalizeAttempt("a1"); expect(mocks.db.attempt.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ passed: false }) })); });
  it("tự nộp ghi thời điểm bằng hạn chót", async () => { const a = attempt(); mocks.db.attempt.findUnique.mockResolvedValueOnce(a); await finalizeAttempt("a1", true); expect(mocks.db.attempt.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ submittedAt: a.deadlineAt, autoSubmitted: true }) })); });
  it("không chấm lại lượt đã nộp", async () => { mocks.db.attempt.findUnique.mockResolvedValue({ status: "SUBMITTED", score: 70 }); expect(await finalizeAttempt("a1")).toMatchObject({ score: 70 }); expect(mocks.db.attempt.update).not.toHaveBeenCalled(); });
  it("lượt không tồn tại trả null", async () => expect(await finalizeAttempt("missing")).toBeNull());
});

describe("F8 · Điều kiện bắt đầu quiz · DEC-016/059", () => {
  const user = { id: "u1", groupId: "g1" };
  function prepare(change = {}) {
    vi.mocked(hasCourseAccess).mockResolvedValue(true);
    vi.mocked(deadlineLock).mockResolvedValue({ locked: false, deadline: null, activeDeadline: null });
    mocks.db.quiz.findUnique.mockResolvedValue({ id: "q1", courseId: "c1", status: "PUBLISHED", course: { status: "PUBLISHED" }, _count: { questions: 2 }, maxAttempts: 3, opensAt: null, closesAt: null, ...change });
  }
  it("cho phép quiz mở và còn lượt", async () => { prepare(); expect(await checkCanStart(user, "q1")).toMatchObject({ ok: true, attemptsUsed: 0 }); });
  it.each([{ status: "DRAFT" }, { course: { status: "DRAFT" } }, { _count: { questions: 0 } }, { opensAt: new Date(Date.now() + 60_000) }, { closesAt: new Date(Date.now() - 60_000) }])("từ chối quiz chưa sẵn sàng %#", async (change) => { prepare(change); expect((await checkCanStart(user, "q1")).ok).toBe(false); });
  it("từ chối người chưa có quyền học", async () => { prepare(); vi.mocked(hasCourseAccess).mockResolvedValue(false); expect((await checkCanStart(user, "q1")).ok).toBe(false); });
  it("từ chối khóa quá hạn", async () => { prepare(); vi.mocked(deadlineLock).mockResolvedValue({ locked: true, deadline: new Date(), activeDeadline: null }); expect((await checkCanStart(user, "q1")).ok).toBe(false); });
  it("hết lượt không cho bắt đầu", async () => { prepare({ maxAttempts: 1 }); mocks.db.attempt.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ status: "SUBMITTED" }]); expect((await checkCanStart(user, "q1")).ok).toBe(false); });
  it("tiếp tục lượt đang làm thay vì tạo mới", async () => { prepare(); mocks.db.attempt.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "a1", status: "IN_PROGRESS" }]); expect(await checkCanStart(user, "q1")).toMatchObject({ ok: true, inProgressId: "a1" }); });
  it("hạn làm bài không vượt thời điểm đóng", async () => { const closesAt = new Date(Date.now() + 60_000); prepare({ closesAt }); expect(await checkCanStart(user, "q1")).toMatchObject({ ok: true, deadlineCap: closesAt }); });
});
