import { describe, it, expect } from "vitest";
import { mocks } from "./setup";
import { savePerson, setUserStatus, saveGroup, deleteGroup, moveMembers, saveCategory, deleteCategory } from "@/server/people-actions";

describe("F2 · Người dùng và nhóm · DEC-012/028/032/034/036", () => {
  const person = { email: "Member@Example.test", role: "MEMBER", fullName: "Member", jobTitle: "Engineer", employeeCode: "E001", groupId: "g1" };
  it("chuẩn hóa email về chữ thường", async () => { expect((await savePerson(null, person)).ok).toBe(true); expect(mocks.db.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: "member@example.test" }) })); });
  it.each([{ email: "bad" }, { jobTitle: "" }, { employeeCode: "" }, { groupId: null }])("từ chối hồ sơ không hợp lệ %#", async (change) => expect((await savePerson(null, { ...person, ...change })).ok).toBe(false));
  it("không cho admin tự bỏ quyền", async () => expect((await savePerson("admin", person)).ok).toBe(false));
  it("không cho admin tự khóa", async () => expect((await setUserStatus("admin", "LOCKED")).ok).toBe(false));
  it("khóa người dùng chỉ cập nhật trạng thái, giữ kết quả", async () => { await setUserStatus("u1", "LOCKED"); expect(mocks.db.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { status: "LOCKED" } }); expect(mocks.db.attempt.deleteMany).not.toHaveBeenCalled(); });
  it("từ chối email trùng", async () => { mocks.db.user.findFirst.mockResolvedValue({ id: "dup" }); expect((await savePerson(null, person)).ok).toBe(false); });
  it("admin không bắt buộc nhóm", async () => { await savePerson(null, { ...person, role: "ADMIN", groupId: null }); expect(mocks.db.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ groupId: null }) })); });
  it("từ chối nhóm rỗng", async () => expect((await saveGroup(null, "  ")).ok).toBe(false));
  it("từ chối tên nhóm trùng", async () => { mocks.db.group.findFirst.mockResolvedValue({ id: "dup" }); expect((await saveGroup(null, "HR")).ok).toBe(false); });
  it("không xóa nhóm còn thành viên", async () => { mocks.db.user.count.mockResolvedValue(2); expect((await deleteGroup("g1")).ok).toBe(false); expect(mocks.db.group.delete).not.toHaveBeenCalled(); });
  it("xóa nhóm rỗng", async () => expect((await deleteGroup("g1")).ok).toBe(true));
  it("chuyển nhóm chỉ áp dụng cho member", async () => { await moveMembers(["u1", "admin"], "g2"); expect(mocks.db.user.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["u1", "admin"] }, role: "MEMBER" }, data: { groupId: "g2" } }); });
});

describe("F9 · Danh mục · DEC-043/044", () => {
  it("từ chối tên trống", async () => expect((await saveCategory(null, " ")).ok).toBe(false));
  it("tạo tên đã trim", async () => { await saveCategory(null, "  HR  "); expect(mocks.db.category.create).toHaveBeenCalledWith({ data: { name: "HR" } }); });
  it("không xóa danh mục còn khóa học", async () => { mocks.db.course.count.mockResolvedValue(1); expect((await deleteCategory("cat1")).ok).toBe(false); });
  it("xóa danh mục không sử dụng", async () => { expect((await deleteCategory("cat1")).ok).toBe(true); expect(mocks.db.category.delete).toHaveBeenCalled(); });
});
