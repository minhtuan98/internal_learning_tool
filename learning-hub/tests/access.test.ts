import { describe, it, expect } from "vitest";
import { mocks } from "./setup";
import { targetWhere, accessibleCourseIds, hasCourseAccess, progressForCourses, assignmentState, deadlineLock, type CourseProgress } from "@/lib/access";

const user = { id: "u1", groupId: "g1" };
const now = new Date("2026-11-06T06:00:00Z");
const progress = (overrides: Partial<CourseProgress> = {}): CourseProgress => ({ lessonsTotal: 1, lessonsDone: 0, quizzes: [], complete: false, started: false, completedAt: null, lastActivity: null, ...overrides });

describe("F3 · Quyền truy cập khóa học · DEC-021/022/033", () => {
  it("ghép quyền cá nhân và nhóm hiện tại", () => expect(targetWhere(user)).toEqual({ OR: [{ userId: "u1" }, { groupId: "g1" }] }));
  it("không cấp quyền nhóm khi thành viên chưa có nhóm", () => expect(targetWhere({ ...user, groupId: null })).toEqual({ OR: [{ userId: "u1" }] }));
  it("chỉ lấy khóa xuất bản và loại ID trùng", async () => {
    mocks.db.courseAccess.findMany.mockResolvedValue([{ courseId: "c1" }, { courseId: "c1" }, { courseId: "c2" }]);
    expect(await accessibleCourseIds(user)).toEqual(["c1", "c2"]);
    expect(mocks.db.courseAccess.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ course: { status: "PUBLISHED" } }) }));
  });
  it.each([0, 1])("quyền truy cập theo số bản ghi %s", async (n) => { mocks.db.courseAccess.count.mockResolvedValue(n); expect(await hasCourseAccess(user, "c1")).toBe(n > 0); });
});

describe("F6 · Tiến độ học tập", () => {
  it("danh sách rỗng không truy vấn dữ liệu", async () => { expect((await progressForCourses("u1", [])).size).toBe(0); expect(mocks.db.lesson.findMany).not.toHaveBeenCalled(); });
  it("khóa học rỗng chưa được xem là hoàn thành", async () => expect((await progressForCourses("u1", ["c1"])).get("c1")?.complete).toBe(false));
  it("học xong tất cả bài nhưng quiz chưa đạt vẫn chưa hoàn thành", async () => {
    mocks.db.lesson.findMany.mockResolvedValue([{ id: "l1", courseId: "c1" }]);
    mocks.db.lessonProgress.findMany.mockResolvedValue([{ lessonId: "l1", completedAt: now, lesson: { courseId: "c1" } }]);
    mocks.db.quiz.findMany.mockResolvedValue([{ id: "q1", courseId: "c1", title: "Quiz", maxAttempts: 3 }]);
    expect((await progressForCourses("u1", ["c1"])).get("c1")?.complete).toBe(false);
  });
  it("điểm tốt nhất và hoàn thành chỉ tính lượt đã nộp", async () => {
    mocks.db.quiz.findMany.mockResolvedValue([{ id: "q1", courseId: "c1", title: "Quiz", maxAttempts: 3 }]);
    mocks.db.attempt.findMany.mockResolvedValue([
      { quizId: "q1", status: "SUBMITTED", score: 80, passed: true, submittedAt: now, startedAt: now },
      { quizId: "q1", status: "IN_PROGRESS", score: 100, passed: false, submittedAt: null, startedAt: now },
    ]);
    const p = (await progressForCourses("u1", ["c1"])).get("c1")!;
    expect(p.complete).toBe(true); expect(p.quizzes[0]).toMatchObject({ bestScore: 80, attemptsUsed: 2, passed: true });
  });
});

describe("F7 · Giao bài và hạn chót · DEC-055/059", () => {
  it.each([
    [progress(), new Date(now.getTime() + 1000), "NOT_STARTED"],
    [progress({ started: true }), new Date(now.getTime() + 1000), "IN_PROGRESS"],
    [progress(), new Date(now.getTime() - 1000), "OVERDUE"],
    [progress({ complete: true, completedAt: now }), now, "COMPLETED"],
  ] as const)("trạng thái giao bài %#", (p, deadline, expected) => expect(assignmentState(p, deadline, now)).toBe(expected));
  it("không khóa nếu chưa được giao bài", async () => expect(await deadlineLock(user, "c1", now)).toMatchObject({ locked: false, activeDeadline: null }));
  it("chọn hạn đang mở sớm nhất khi có nhiều giao bài", async () => {
    const soon = new Date(now.getTime() + 1000);
    mocks.db.assignment.findMany.mockResolvedValue([{ deadline: new Date(now.getTime() - 1) }, { deadline: new Date(now.getTime() + 3000) }, { deadline: soon }]);
    expect(await deadlineLock(user, "c1", now)).toMatchObject({ locked: false, activeDeadline: soon });
  });
  it("khóa khóa học chưa hoàn thành khi hết mọi hạn chót", async () => { mocks.db.assignment.findMany.mockResolvedValue([{ deadline: new Date(now.getTime() - 1) }]); expect((await deadlineLock(user, "c1", now)).locked).toBe(true); });
  it("giữ quyền xem khóa đã hoàn thành sau hạn", async () => {
    mocks.db.assignment.findMany.mockResolvedValue([{ deadline: new Date(now.getTime() - 1) }]);
    mocks.db.lesson.findMany.mockResolvedValue([{ id: "l1", courseId: "c1" }]);
    mocks.db.lessonProgress.findMany.mockResolvedValue([{ lessonId: "l1", completedAt: now, lesson: { courseId: "c1" } }]);
    expect((await deadlineLock(user, "c1", now)).locked).toBe(false);
  });
});
