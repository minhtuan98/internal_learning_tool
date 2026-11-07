import { describe, it, expect } from "vitest";
import { mocks } from "./setup";
import { buildOrder, checkReturn, computeFlags, orderForAttempt, toDisplaySlot, toOriginalIndex } from "@/lib/integrity";
import { acknowledgeWarning, attemptHeartbeat, reportViolation, saveAnswer } from "@/server/member-actions";
import { updateMaxViolations } from "@/server/integrity-actions";
import { setQuizReviewRelease } from "@/server/quiz-actions";

const open = (extra: object = {}) => ({ id: "a1", userId: "u1", quizId: "quiz1", status: "IN_PROGRESS", deadlineAt: new Date(Date.now() + 60_000), violations: 0, voided: false, ...extra });

describe("F11 · Chống gian lận · Xáo trộn đề", () => {
  it("mỗi lượt có thứ tự câu hỏi là hoán vị đầy đủ và thứ tự đáp án hợp lệ", () => {
    const o = buildOrder([{ id: "q1", optionCount: 4 }, { id: "q2", optionCount: 4 }, { id: "q3", optionCount: 4 }]);
    expect([...JSON.parse(o.questionOrder)].sort()).toEqual(["q1", "q2", "q3"]);
    for (const perm of Object.values(JSON.parse(o.optionOrders)) as number[][]) expect([...perm].sort()).toEqual([0, 1, 2, 3]);
  });
  it("vị trí hiển thị ⇄ chỉ số gốc là hai chiều", () => {
    const a = { optionOrders: JSON.stringify({ q1: [2, 0, 3, 1] }) };
    expect(toOriginalIndex(a, "q1", 0)).toBe(2);
    expect(toDisplaySlot(a, "q1", 2)).toBe(0);
    for (let slot = 0; slot < 4; slot++) expect(toDisplaySlot(a, "q1", toOriginalIndex(a, "q1", slot))).toBe(slot);
    expect(toOriginalIndex({}, "q1", 3)).toBe(3); // attempts from before shuffling keep identity
  });
  it("hiển thị câu hỏi theo thứ tự của lượt và đảo đáp án", () => {
    const a = { questionOrder: JSON.stringify(["q2", "q1"]), optionOrders: JSON.stringify({ q1: [1, 0], q2: [0, 1] }) };
    const out = orderForAttempt(a, [{ id: "q1", options: ["A", "B"] }, { id: "q2", options: ["C", "D"] }]);
    expect(out.map((q) => q.id)).toEqual(["q2", "q1"]);
    expect(out[1].options).toEqual(["B", "A"]);
  });
  it("lưu đáp án theo chỉ số gốc", async () => {
    mocks.db.attempt.findUnique.mockResolvedValue(open({ optionOrders: JSON.stringify({ q1: [3, 2, 1, 0] }) }));
    mocks.db.question.findUnique.mockResolvedValue({ quizId: "quiz1", reviewStatus: "APPROVED" });
    expect((await saveAnswer("a1", "q1", 0)).ok).toBe(true);
    expect(mocks.db.answer.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { attemptId: "a1", questionId: "q1", selectedIndex: 3 } }));
  });
});

describe("F11 · Chống gian lận · Vi phạm", () => {
  it("ghi vi phạm và cảnh báo khi chưa vượt ngưỡng", async () => {
    mocks.db.attempt.findUnique.mockResolvedValue(open());
    mocks.db.setting.findUnique.mockResolvedValue({ key: "quiz.maxViolations", value: "3" });
    mocks.db.attempt.update.mockResolvedValue({ violations: 2 });
    const r = await reportViolation("a1", "TAB_HIDDEN", 4000);
    expect(r).toMatchObject({ ok: true, data: { count: 2, max: 3, voided: false } });
    expect(mocks.db.attemptEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ attemptId: "a1", type: "TAB_HIDDEN", durationMs: 4000 }) });
  });
  it("vượt ngưỡng thì hủy lượt: 0 điểm, không đạt", async () => {
    mocks.db.attempt.findUnique.mockResolvedValue(open({ violations: 3 }));
    mocks.db.setting.findUnique.mockResolvedValue({ key: "quiz.maxViolations", value: "3" });
    mocks.db.attempt.update.mockResolvedValueOnce({ violations: 4 });
    const r = await reportViolation("a1", "COPY");
    expect(r).toMatchObject({ ok: true, data: { voided: true } });
    expect(mocks.db.attempt.update).toHaveBeenLastCalledWith({ where: { id: "a1" }, data: expect.objectContaining({ status: "SUBMITTED", voided: true, score: 0, passed: false }) });
  });
  it("không nhận loại vi phạm lạ hoặc lượt của người khác", async () => {
    expect((await reportViolation("a1", "HACK" as never)).ok).toBe(false);
    mocks.db.attempt.findUnique.mockResolvedValue(open({ userId: "other" }));
    expect((await reportViolation("a1", "COPY")).ok).toBe(false);
  });
  it("lượt đã nộp không bị tính thêm", async () => {
    mocks.db.attempt.findUnique.mockResolvedValue(open({ status: "SUBMITTED", violations: 1 }));
    expect((await reportViolation("a1", "COPY")).ok).toBe(true);
    expect(mocks.db.attempt.update).not.toHaveBeenCalled();
  });
  it("tab/thiết bị thứ hai chỉ gắn cờ một lần, không tính vi phạm", async () => {
    mocks.db.attempt.findUnique.mockResolvedValue(open({ sessionToken: "tab-1" }));
    expect((await attemptHeartbeat("a1", "tab-2")).ok).toBe(true);
    expect(mocks.db.attemptEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: "MULTI_SESSION", violation: false, detail: "tab-2" }) });
    expect(mocks.db.attempt.update).not.toHaveBeenCalled();
  });
});

describe("F11 · Chống gian lận · Quyền admin", () => {
  it("chỉ admin đặt ngưỡng, trong khoảng 0–20", async () => {
    expect((await updateMaxViolations(25)).ok).toBe(false);
    expect((await updateMaxViolations(3)).ok).toBe(true);
    mocks.admin.mockResolvedValue(null);
    expect((await updateMaxViolations(3)).ok).toBe(false);
  });
  it("chỉ admin mở/khóa xem đúng sai", async () => {
    mocks.admin.mockResolvedValue(null);
    expect((await setQuizReviewRelease("quiz1", true)).ok).toBe(false);
  });
});

describe("F11 · Chống gian lận · Cờ bất thường", () => {
  const base = { quizId: "quiz1", status: "SUBMITTED", ip: null, deadlineAt: new Date("2026-11-06T10:15:00Z"), totalCount: 10, events: [] as { type: string }[] };
  const answers = Array.from({ length: 6 }, (_, i) => ({ questionId: `q${i}`, selectedIndex: i % 4 }));
  it("nộp quá nhanh, cùng mạng cùng lúc, đáp án giống hệt", () => {
    const a = { ...base, id: "a", userId: "u1", ip: "10.0.0.1", startedAt: new Date("2026-11-06T10:00:00Z"), submittedAt: new Date("2026-11-06T10:00:30Z"), answers };
    const b = { ...base, id: "b", userId: "u2", ip: "10.0.0.1", startedAt: new Date("2026-11-06T10:00:10Z"), submittedAt: new Date("2026-11-06T10:09:00Z"), answers };
    const f = computeFlags([a, b]);
    expect(f.get("a")!.map((x) => x.flag).sort()).toEqual(["IDENTICAL", "SAME_NETWORK", "TOO_FAST"]);
    expect(f.get("b")!.map((x) => x.flag).sort()).toEqual(["IDENTICAL", "SAME_NETWORK"]);
  });
  it("cùng một người không tự gắn cờ với chính mình", () => {
    const a = { ...base, id: "a", userId: "u1", ip: "1.1.1.1", startedAt: new Date("2026-11-06T10:00:00Z"), submittedAt: new Date("2026-11-06T10:09:00Z"), answers };
    const b = { ...a, id: "b" };
    expect(computeFlags([a, b]).size).toBe(0);
  });
});

describe("F11 · Chống gian lận · Phát hiện chặt hơn (7/11)", () => {
  const info = { ip: null, userAgent: null };
  it("rời trang lúc cảnh báo đang mở: chỉ ghi nhận, không tính", async () => {
    mocks.db.attempt.findUnique.mockResolvedValue(open({ violations: 1 }));
    const r = await reportViolation("a1", "TAB_HIDDEN", 5000, true);
    expect(r).toMatchObject({ ok: true, data: { count: 1, voided: false } });
    expect(mocks.db.attemptEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: "TAB_HIDDEN", violation: false }) });
    expect(mocks.db.attempt.update).not.toHaveBeenCalled();
  });
  it("mở công cụ nhà phát triển là vi phạm", async () => {
    mocks.db.attempt.findUnique.mockResolvedValue(open());
    mocks.db.attempt.update.mockResolvedValue({ violations: 1 });
    expect((await reportViolation("a1", "DEVTOOLS")).ok).toBe(true);
    expect(mocks.db.attemptEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: "DEVTOOLS" }) });
  });
  it("trình duyệt không được tự báo LEFT_PAGE", async () => {
    expect((await reportViolation("a1", "LEFT_PAGE" as never)).ok).toBe(false);
  });
  it("đóng tab 10 giây rồi mở lại → tính LEFT_PAGE", async () => {
    const now = new Date("2026-11-07T10:00:10Z");
    mocks.db.attempt.update.mockResolvedValueOnce({}).mockResolvedValueOnce({ violations: 1 });
    const r = await checkReturn({ id: "a1", status: "IN_PROGRESS", leftAt: new Date("2026-11-07T10:00:00Z"), lastSeenAt: new Date("2026-11-07T09:59:58Z") }, info, now);
    expect(r).toMatchObject({ type: "LEFT_PAGE", count: 1, voided: false });
    expect(mocks.db.attemptEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: "LEFT_PAGE", durationMs: 10_000 }) });
  });
  it("tải lại trang 1 giây → không tính", async () => {
    const now = new Date("2026-11-07T10:00:01Z");
    expect(await checkReturn({ id: "a1", status: "IN_PROGRESS", leftAt: new Date("2026-11-07T10:00:00Z"), lastSeenAt: new Date("2026-11-07T09:59:55Z") }, info, now)).toBeNull();
    expect(mocks.db.attemptEvent.create).not.toHaveBeenCalled();
  });
  it("không có beacon nhưng mất heartbeat > 25 giây → tính LEFT_PAGE", async () => {
    const now = new Date("2026-11-07T10:01:00Z");
    mocks.db.attempt.update.mockResolvedValueOnce({}).mockResolvedValueOnce({ violations: 2 });
    const r = await checkReturn({ id: "a1", status: "IN_PROGRESS", leftAt: null, lastSeenAt: new Date("2026-11-07T10:00:00Z") }, info, now);
    expect(r).toMatchObject({ type: "LEFT_PAGE", count: 2 });
  });
  it("mở lần đầu hoặc lượt đã nộp → không tính", async () => {
    expect(await checkReturn({ id: "a1", status: "IN_PROGRESS", leftAt: null, lastSeenAt: null }, info)).toBeNull();
    expect(await checkReturn({ id: "a1", status: "SUBMITTED", leftAt: new Date(0), lastSeenAt: null }, info)).toBeNull();
    expect(mocks.db.attemptEvent.create).not.toHaveBeenCalled();
  });
  it("heartbeat làm mới lastSeenAt và xóa mốc rời trang", async () => {
    mocks.db.attempt.findUnique.mockResolvedValue(open({ sessionToken: "tab-1" }));
    await attemptHeartbeat("a1", "tab-1");
    expect(mocks.db.attempt.updateMany).toHaveBeenCalledWith({ where: { id: "a1", status: "IN_PROGRESS" }, data: expect.objectContaining({ leftAt: null }) });
  });
});

describe("F12 · Cảnh báo chờ xác nhận (lỗi Codex 7/11)", () => {
  const info = { ip: null, userAgent: null };
  it("vi phạm được tính sẽ đặt cảnh báo chờ xác nhận", async () => {
    mocks.db.attempt.findUnique.mockResolvedValue(open());
    mocks.db.attempt.update.mockResolvedValue({ violations: 1 });
    await reportViolation("a1", "COPY");
    expect(mocks.db.attempt.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { violations: { increment: 1 }, warningPending: "COPY" } });
  });
  it("khi còn cảnh báo chờ xác nhận, server không tính thêm (chỉ ghi nhận)", async () => {
    mocks.db.attempt.findUnique.mockResolvedValue(open({ violations: 2, warningPending: "TAB_HIDDEN" }));
    const r = await reportViolation("a1", "CONTEXT_MENU");
    expect(r).toMatchObject({ ok: true, data: { count: 2 } });
    expect(mocks.db.attemptEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: "CONTEXT_MENU", violation: false }) });
    expect(mocks.db.attempt.update).not.toHaveBeenCalled();
  });
  it("rời trang > 3 giây khi cảnh báo chưa xác nhận: không tính LEFT_PAGE, cảnh báo cũ hiện lại", async () => {
    const now = new Date("2026-11-07T10:00:10Z");
    mocks.db.setting.findUnique.mockResolvedValue({ key: "quiz.maxViolations", value: "3" });
    const r = await checkReturn({ id: "a1", status: "IN_PROGRESS", leftAt: new Date("2026-11-07T10:00:00Z"), lastSeenAt: now, violations: 2, warningPending: "TAB_HIDDEN" }, info, now);
    expect(r).toMatchObject({ type: "TAB_HIDDEN", count: 2, max: 3, voided: false });
    expect(mocks.db.attemptEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: "LEFT_PAGE", violation: false }) });
    expect(mocks.db.attempt.update).toHaveBeenCalledTimes(1); // only the leftAt / lastSeenAt reset, no increment
  });
  it("tải lại nhanh không làm mất cảnh báo chưa xác nhận", async () => {
    const now = new Date("2026-11-07T10:00:01Z");
    const r = await checkReturn({ id: "a1", status: "IN_PROGRESS", leftAt: new Date("2026-11-07T10:00:00Z"), lastSeenAt: now, violations: 1, warningPending: "COPY" }, info, now);
    expect(r).toMatchObject({ type: "COPY", count: 1 });
    expect(mocks.db.attemptEvent.create).not.toHaveBeenCalled();
  });
  it("bấm Tôi đã hiểu xóa cảnh báo chờ; chỉ chủ lượt thi", async () => {
    mocks.db.attempt.findUnique.mockResolvedValue(open({ warningPending: "COPY" }));
    expect((await acknowledgeWarning("a1")).ok).toBe(true);
    expect(mocks.db.attempt.updateMany).toHaveBeenCalledWith({ where: { id: "a1", status: "IN_PROGRESS" }, data: { warningPending: null } });
    mocks.db.attempt.findUnique.mockResolvedValue(open({ userId: "other" }));
    expect((await acknowledgeWarning("a1")).ok).toBe(false);
  });
});
