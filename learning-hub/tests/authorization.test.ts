import { describe, it, expect } from "vitest";
import { mocks } from "./setup";
import * as people from "@/server/people-actions";
import * as content from "@/server/content-actions";
import * as quiz from "@/server/quiz-actions";
import * as assignment from "@/server/assignment-actions";
import * as member from "@/server/member-actions";
import { updateCertificateSettings } from "@/server/certificate-actions";

describe("F1 · Mọi thao tác ghi kiểm tra vai trò", () => {
  const adminCalls: [string, () => Promise<{ ok: boolean } >][] = [
    ["savePerson", () => people.savePerson(null, {})], ["setUserStatus", () => people.setUserStatus("u1", "LOCKED")],
    ["saveGroup", () => people.saveGroup(null, "HR")], ["deleteGroup", () => people.deleteGroup("g1")],
    ["moveMembers", () => people.moveMembers(["u1"], "g1")], ["saveCategory", () => people.saveCategory(null, "HR")], ["deleteCategory", () => people.deleteCategory("cat")],
    ["saveCourse", () => content.saveCourse(null, {})], ["setCourseStatus", () => content.setCourseStatus("c1", "PUBLISHED")], ["deleteCourse", () => content.deleteCourse("c1")],
    ["saveLesson", () => content.saveLesson("c1", null, {})], ["deleteLesson", () => content.deleteLesson("l1")], ["reorderLessons", () => content.reorderLessons("c1", [])],
    ["setCourseAccess", () => content.setCourseAccess("c1", [], [])], ["fetchTranscript", () => content.fetchTranscript("l1")],
    ["createQuiz", () => quiz.createQuiz("c1", { title: "Quiz", lessonIds: [] })], ["updateQuizInfo", () => quiz.updateQuizInfo("q1", { title: "Quiz", lessonIds: [] })],
    ["saveQuizSettings", () => quiz.saveQuizSettings("q1", {})], ["generateQuizQuestions", () => quiz.generateQuizQuestions("q1", 5)],
    ["updateQuestion", () => quiz.updateQuestion("q1", {}, true)], ["reviewQuestion", () => quiz.reviewQuestion("q1", "APPROVED")], ["approveAllPending", () => quiz.approveAllPending("q1")],
    ["setQuizStatus", () => quiz.setQuizStatus("q1", "PUBLISHED")], ["deleteQuiz", () => quiz.deleteQuiz("q1")],
    ["checkAssignmentAccess", () => assignment.checkAssignmentAccess({ courseId: "c1", userIds: [], groupIds: [], deadline: "" })],
    ["saveAssignment", () => assignment.saveAssignment(null, { courseId: "c1", userIds: [], groupIds: [], deadline: "" })], ["deleteAssignment", () => assignment.deleteAssignment("a1")],
    ["updateCertificateSettings", () => updateCertificateSettings({ signerName: "", signerTitle: "", sealCode: "", sealLabel: "", sealRing: "" })],
  ];
  it.each(adminCalls)("%s từ chối người không phải admin", async (_, call) => {
    mocks.admin.mockResolvedValue(null);
    expect((await call()).ok).toBe(false);
    for (const table of Object.values(mocks.tables)) for (const method of ["create", "update", "delete", "createMany", "updateMany", "deleteMany", "upsert"]) expect(table[method]).not.toHaveBeenCalled();
  });
  it.each([
    ["completeLesson", () => member.completeLesson("l1")], ["startAttempt", () => member.startAttempt("q1")],
    ["saveAnswer", () => member.saveAnswer("a1", "q1", 0)], ["submitAttempt", () => member.submitAttempt("a1")],
  ] as const)("%s yêu cầu member đăng nhập", async (_, call) => { mocks.member.mockResolvedValue(null); expect((await call()).ok).toBe(false); });
});
