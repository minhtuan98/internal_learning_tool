import { describe, it, expect } from "vitest";
import { mocks } from "./setup";
import { saveAssignment } from "@/server/assignment-actions";
import { saveLesson, setCourseStatus } from "@/server/content-actions";
import { approveAllPending, generateQuizQuestions, reviewQuestion, updateQuestion, saveQuizSettings, setQuizStatus } from "@/server/quiz-actions";
import { setUserStatus } from "@/server/people-actions";
import { toEmbedUrl } from "@/lib/video";
import { progressForCourses } from "@/lib/access";

// Acceptance rules exercise production functions. No expected failures or implementation copies.
describe("System audit · Validate persisted writes", () => {
  const assignment = () => ({ courseId: "c1", userIds: ["u1"], groupIds: [], deadline: new Date(Date.now() + 86400000).toISOString() });
  it.each([null, { id: "c1", status: "DRAFT" }])("rejects assigning an unavailable course, bypassing preflight: %j", async (course) => {
    mocks.db.course.findUnique.mockResolvedValue(course);
    expect((await saveAssignment(null, assignment())).ok).toBe(false);
    expect(mocks.db.assignment.create).not.toHaveBeenCalled();
  });
  it("rejects an assignment with no actual member recipients", async () => {
    mocks.db.course.findUnique.mockResolvedValue({ id: "c1", status: "PUBLISHED" });
    expect((await saveAssignment(null, assignment())).ok).toBe(false);
    expect(mocks.db.assignment.create).not.toHaveBeenCalled();
  });
  it("cannot edit a lesson using another course ID", async () => {
    mocks.db.lesson.findUnique.mockResolvedValue({ id: "l1", courseId: "other" });
    expect((await saveLesson("c1", "l1", { type: "ARTICLE", title: "Changed", articleBody: "Content" })).ok).toBe(false);
    expect(mocks.db.lesson.update).not.toHaveBeenCalled();
  });
  it.each(["opensAt", "closesAt"])("rejects an invalid %s before writing dates", async (field) => {
    expect((await saveQuizSettings("q1", { passScore: 80, maxAttempts: 3, timeLimitMinutes: 10, [field]: "not-a-date" })).ok).toBe(false);
    expect(mocks.db.quiz.update).not.toHaveBeenCalled();
  });
  it("rejects an unsupported course status at the server boundary", async () => {
    expect((await setCourseStatus("c1", "INVALID" as "DRAFT")).ok).toBe(false);
    expect(mocks.db.course.update).not.toHaveBeenCalled();
  });
  it("rejects an unsupported quiz status at the server boundary", async () => {
    mocks.db.quiz.findUnique.mockResolvedValue({ id: "q1", courseId: "c1" });
    expect((await setQuizStatus("q1", "INVALID" as "DRAFT")).ok).toBe(false);
    expect(mocks.db.quiz.update).not.toHaveBeenCalled();
  });
  it("rejects an unsupported account status at the server boundary", async () => {
    expect((await setUserStatus("u1", "INVALID" as "ACTIVE")).ok).toBe(false);
    expect(mocks.db.user.update).not.toHaveBeenCalled();
  });
});

describe("System audit · Safe video URLs", () => {
  it.each(["ftp://youtu.be/abc", "ftp://drive.google.com/file/d/abc/view", "https://youtu.be/", "https://youtube.com/embed/", "https://youtube.com/watch?v=..%2Fbad%3Fx%3Dy"])("rejects malformed or non-web video: %s", (url) => {
    expect(toEmbedUrl(url)).toBeNull();
  });
});

describe("System audit · Stable completion history", () => {
  it("a later quiz retake does not change the date a course was first completed", async () => {
    const first = new Date("2026-10-01T10:00:00Z");
    const second = new Date("2026-10-05T10:00:00Z");
    const retake = new Date("2026-10-20T10:00:00Z");
    mocks.db.lesson.findMany.mockResolvedValue([{ id: "l1", courseId: "c1" }]);
    mocks.db.lessonProgress.findMany.mockResolvedValue([{ lessonId: "l1", completedAt: first, lesson: { courseId: "c1" } }]);
    mocks.db.quiz.findMany.mockResolvedValue([{ id: "q1", courseId: "c1", maxAttempts: 3 }, { id: "q2", courseId: "c1", maxAttempts: 3 }]);
    mocks.db.attempt.findMany.mockResolvedValue([
      { quizId: "q1", status: "SUBMITTED", passed: true, score: 100, startedAt: first, submittedAt: first },
      { quizId: "q1", status: "SUBMITTED", passed: true, score: 100, startedAt: retake, submittedAt: retake },
      { quizId: "q2", status: "SUBMITTED", passed: true, score: 100, startedAt: second, submittedAt: second },
    ]);
    const p = (await progressForCourses("u1", ["c1"])).get("c1")!;
    expect(p.complete).toBe(true);
    expect(p.completedAt).toEqual(second);
    expect(p.lastActivity).toEqual(retake);
  });
});


describe("System audit · Stable questions while members take a quiz", () => {
  it("blocks editing the answer key during a live attempt", async () => {
    mocks.db.question.findUnique.mockResolvedValue({ id: "q1", quizId: "quiz1", text: "Original question?", options: '["A","B","C","D"]', correctIndex: 0, reviewStatus: "APPROVED", quiz: { id: "quiz1", courseId: "c1" } });
    mocks.db.attempt.count.mockResolvedValue(1);
    expect((await updateQuestion("q1", { text: "Original question?", options: ["A", "B", "C", "D"], correctIndex: 1 }, false)).ok).toBe(false);
    expect(mocks.db.question.update).not.toHaveBeenCalled();
  });
  it("cannot remove a question from a live quiz", async () => {
    mocks.db.question.findUnique.mockResolvedValue({ id: "q1", quizId: "quiz1", reviewStatus: "APPROVED" });
    mocks.db.attempt.count.mockResolvedValue(1);
    expect((await reviewQuestion("q1", "REJECTED")).ok).toBe(false);
    expect(mocks.db.question.update).not.toHaveBeenCalled();
  });
  it("cannot add freshly approved questions to a live quiz", async () => {
    mocks.db.attempt.count.mockResolvedValue(1);
    expect((await approveAllPending("quiz1")).ok).toBe(false);
    expect(mocks.db.question.updateMany).not.toHaveBeenCalled();
  });
  it("rejects NaN counts before invoking question generation", async () => {
    expect((await generateQuizQuestions("quiz1", NaN)).ok).toBe(false);
    expect(mocks.db.question.createMany).not.toHaveBeenCalled();
  });
});
