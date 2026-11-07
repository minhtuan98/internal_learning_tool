import { describe, it, expect, vi } from "vitest";
import { mocks } from "./setup";
vi.mock("@/lib/access", () => ({ usersWithAccess: vi.fn() }));
import { usersWithAccess } from "@/lib/access";
import { checkAssignmentAccess, saveAssignment, deleteAssignment } from "@/server/assignment-actions";

describe("F7 · Giao bài · DEC-055/056", () => {
  const input = () => ({ courseId: "c1", userIds: ["u1"], groupIds: [], deadline: new Date(Date.now() + 86_400_000).toISOString() });
  it.each([{ courseId: "" }, { userIds: [], groupIds: [] }, { deadline: "invalid" }, { deadline: "2000-01-01" }])("từ chối giao bài không hợp lệ %#", async (change) => expect((await saveAssignment(null, { ...input(), ...change })).ok).toBe(false));
  it("báo người chưa có quyền truy cập trước khi giao", async () => { mocks.db.course.findUnique.mockResolvedValue({ status: "PUBLISHED" }); mocks.db.user.findMany.mockResolvedValue([{ id: "u1", email: "u@example.test", fullName: "User", group: null }]); vi.mocked(usersWithAccess).mockResolvedValue(new Set()); expect(await checkAssignmentAccess(input())).toMatchObject({ ok: true, data: { total: 1, missing: [{ id: "u1" }] } }); });
  it("không cho kiểm tra giao khóa nháp", async () => { mocks.db.course.findUnique.mockResolvedValue({ status: "DRAFT" }); expect((await checkAssignmentAccess(input())).ok).toBe(false); });
  it("lưu người giao và mục tiêu", async () => { mocks.db.course.findUnique.mockResolvedValue({ id: "c1", status: "PUBLISHED" }); mocks.db.user.findMany.mockResolvedValue([{ id: "u1", role: "MEMBER" }]); expect((await saveAssignment(null, input())).ok).toBe(true); expect(mocks.db.assignment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ createdById: "admin", targets: { create: [{ userId: "u1" }] } }) })); });
  it("xóa giao bài giữ nguyên kết quả học", async () => { await deleteAssignment("asg1"); expect(mocks.db.assignment.delete).toHaveBeenCalledWith({ where: { id: "asg1" } }); expect(mocks.db.attempt.deleteMany).not.toHaveBeenCalled(); });
});
