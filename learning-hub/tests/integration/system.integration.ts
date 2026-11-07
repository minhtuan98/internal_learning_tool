import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Only the request/session boundary is controlled. Prisma, SQLite, queries, foreign
// keys, transactions, scoring, sanitization and progress calculations are real.
const session = vi.hoisted(() => ({ user: null as { id: string; groupId: string; role: string; email: string; fullName: string } | null }));
vi.mock("@/lib/auth", () => ({
  actionAdmin: async () => session.user?.role === "ADMIN" ? session.user : null,
  actionMember: async () => session.user?.role === "MEMBER" ? session.user : null,
}));
vi.mock("next/cache", () => ({ revalidatePath() {} }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

let directory: string;
let prisma: typeof import("@/lib/db").prisma;
let people: typeof import("@/server/people-actions");
let content: typeof import("@/server/content-actions");
let assignments: typeof import("@/server/assignment-actions");
let member: typeof import("@/server/member-actions");
let quizActions: typeof import("@/server/quiz-actions");
let access: typeof import("@/lib/access");
let admin: NonNullable<typeof session.user>, learner: NonNullable<typeof session.user>;
let categoryId: string;

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "learning-hub-integration-"));
  const dbPath = path.join(directory, "test.db");
  await copyFile(path.resolve("prisma/dev.db"), dbPath);
  vi.stubEnv("DATABASE_URL", `file:${dbPath}`);
  vi.stubEnv("VERCEL", "");
  ({ prisma } = await import("@/lib/db"));
  people = await import("@/server/people-actions");
  content = await import("@/server/content-actions");
  assignments = await import("@/server/assignment-actions");
  member = await import("@/server/member-actions");
  quizActions = await import("@/server/quiz-actions");
  access = await import("@/lib/access");
  const group = await prisma.group.create({ data: { name: "Integration isolated group" } });
  categoryId = (await prisma.category.create({ data: { name: "Integration isolated category" } })).id;
  const common = { groupId: group.id, jobTitle: "QA", fullName: "Integration User" };
  admin = await prisma.user.create({ data: { ...common, email: "integration-admin@example.test", employeeCode: "INT-ADMIN", role: "ADMIN" } }) as typeof admin;
  learner = await prisma.user.create({ data: { ...common, email: "integration-learner@example.test", employeeCode: "INT-MEMBER", role: "MEMBER" } }) as typeof learner;
});
afterAll(async () => { await prisma?.$disconnect(); vi.unstubAllEnvs(); if (directory) await rm(directory, { recursive: true, force: true }); });

async function course(title: string) {
  session.user = admin;
  const result = await content.saveCourse(null, { title: `Integration ${title}`, description: "Isolated acceptance fixture", coverImage: "cover.png", categoryId });
  expect(result.ok).toBe(true);
  if (!result.ok || !result.data) throw new Error("Fixture creation failed");
  return result.data.id;
}
async function assignmentInput(courseId: string) {
  return { courseId, userIds: [learner.id], groupIds: [], deadline: new Date(Date.now() + 3600000).toISOString() };
}

describe("Real SQLite · Course, assignment, quiz and certificate journey", () => {
  it("saves sanitized content; refuses publication without a lesson and assignment of drafts", async () => {
    const id = await course("content");
    expect((await content.setCourseStatus(id, "PUBLISHED")).ok).toBe(false);
    expect((await assignments.saveAssignment(null, await assignmentInput(id))).ok).toBe(false);
    const lesson = await content.saveLesson(id, null, { type: "ARTICLE", title: "Safe article", articleBody: '<p onclick="evil()">Learn safely</p><script>evil()</script>' });
    expect(lesson.ok).toBe(true);
    if (!lesson.ok || !lesson.data) throw new Error("Lesson missing");
    expect((await prisma.lesson.findUniqueOrThrow({ where: { id: lesson.data.id } })).articleBody).toBe("<p>Learn safely</p>");
    expect((await content.setCourseStatus(id, "PUBLISHED")).ok).toBe(true);
    expect((await assignments.saveAssignment(null, await assignmentInput(id))).ok).toBe(true);
    expect(await prisma.assignment.count({ where: { courseId: id, targets: { some: { userId: learner.id } } } })).toBe(1);
  });
  it("cannot rewrite an existing lesson through a foreign course ID", async () => {
    const a = await course("owner A"), b = await course("owner B");
    const lesson = await prisma.lesson.create({ data: { courseId: a, position: 1, type: "ARTICLE", title: "Original", articleBody: "Original body" } });
    expect((await content.saveLesson(b, lesson.id, { type: "ARTICLE", title: "Hijacked", articleBody: "Wrong course" })).ok).toBe(false);
    expect((await prisma.lesson.findUniqueOrThrow({ where: { id: lesson.id } })).title).toBe("Original");
  });
  it("enforces group access, shuffled answers, real scoring, progress and idempotent certificates", async () => {
    const id = await course("full learner journey");
    const lesson = await prisma.lesson.create({ data: { courseId: id, position: 1, title: "Quiz source", type: "ARTICLE", articleBody: "Useful learning content for the integration quiz." } });
    await content.setCourseStatus(id, "PUBLISHED");
    await content.setCourseAccess(id, [], [learner.groupId]);
    const quiz = await prisma.quiz.create({ data: { courseId: id, title: "Acceptance quiz", status: "PUBLISHED", maxAttempts: 2, passScore: 80 } });
    const question = await prisma.question.create({ data: { quizId: quiz.id, position: 1, text: "Which answer is correct?", options: '["Correct","Wrong B","Wrong C","Wrong D"]', correctIndex: 0, reviewStatus: "APPROVED" } });
    const foreignQuiz = await prisma.quiz.create({ data: { courseId: id, title: "Other quiz", status: "DRAFT" } });
    const foreign = await prisma.question.create({ data: { quizId: foreignQuiz.id, position: 1, text: "Other question", options: '["A","B","C","D"]', correctIndex: 1, reviewStatus: "APPROVED" } });
    session.user = learner;
    expect(await access.hasCourseAccess(learner, id)).toBe(true);
    expect((await member.completeLesson(lesson.id)).ok).toBe(true);
    const started = await member.startAttempt(quiz.id);
    expect(started.ok).toBe(true);
    if (!started.ok || !started.data) throw new Error("Attempt missing");
    const attemptId = started.data.attemptId;
    session.user = admin;
    expect((await quizActions.updateQuestion(question.id, { text: question.text, options: ["Correct", "Wrong B", "Wrong C", "Wrong D"], correctIndex: 1 }, false)).ok).toBe(false);
    expect((await quizActions.reviewQuestion(question.id, "REJECTED")).ok).toBe(false);
    expect((await prisma.question.findUniqueOrThrow({ where: { id: question.id } })).correctIndex).toBe(0);
    session.user = learner;
    expect((await member.saveAnswer(attemptId, foreign.id, 0)).ok).toBe(false);
    expect((await member.saveAnswer(attemptId, question.id, 1.5)).ok).toBe(false);
    const attempt = await prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
    const slot = (JSON.parse(attempt.optionOrders!)[question.id] as number[]).indexOf(0);
    expect((await member.saveAnswer(attemptId, question.id, slot)).ok).toBe(true);
    expect((await member.submitAttempt(attemptId)).ok).toBe(true);
    expect(await prisma.attempt.findUnique({ where: { id: attemptId } })).toMatchObject({ status: "SUBMITTED", score: 100, passed: true, correctCount: 1, totalCount: 1 });
    expect((await access.courseProgress(learner.id, id)).complete).toBe(true);
    const certificate = await prisma.certificate.findUniqueOrThrow({ where: { userId_courseId: { userId: learner.id, courseId: id } } });
    expect(certificate.courseTitle).toBe("Integration full learner journey");
    await member.submitAttempt(attemptId);
    expect(await prisma.certificate.count({ where: { userId: learner.id, courseId: id } })).toBe(1);
    expect((await member.saveAnswer(attemptId, question.id, 1)).ok).toBe(false);
    expect(await prisma.answer.count({ where: { attemptId } })).toBe(1);
  });
  it("grades expired attempts before an admin changes the answer key", async () => {
    session.user = admin;
    const quiz = await prisma.quiz.findFirstOrThrow({ where: { title: "Acceptance quiz" }, include: { questions: true } });
    const question = quiz.questions[0];
    const expired = await prisma.attempt.create({ data: { quizId: quiz.id, userId: learner.id, number: 2, deadlineAt: new Date(Date.now() - 60_000), answers: { create: { questionId: question.id, selectedIndex: 0 } } } });
    expect((await quizActions.updateQuestion(question.id, { text: question.text, options: ["Correct", "Wrong B", "Wrong C", "Wrong D"], correctIndex: 1 }, false)).ok).toBe(true);
    expect(await prisma.attempt.findUniqueOrThrow({ where: { id: expired.id } })).toMatchObject({ status: "SUBMITTED", score: 100, passed: true, autoSubmitted: true });
    expect((await prisma.question.findUniqueOrThrow({ where: { id: question.id } })).correctIndex).toBe(1);
  });
  it("requires the real current role on writes and rejects malformed quiz dates", async () => {
    session.user = learner;
    expect((await people.setUserStatus(admin.id, "LOCKED")).ok).toBe(false);
    session.user = null;
    expect((await member.startAttempt("anything")).ok).toBe(false);
    session.user = admin;
    const quiz = await prisma.quiz.findFirstOrThrow({ where: { title: "Acceptance quiz" } });
    expect((await quizActions.saveQuizSettings(quiz.id, { passScore: 80, timeLimitMinutes: 10, maxAttempts: 2, opensAt: "invalid" })).ok).toBe(false);
    expect((await prisma.quiz.findUniqueOrThrow({ where: { id: quiz.id } })).opensAt).toBeNull();
  });
});
