import { describe, it, expect } from "vitest";
import { mocks } from "./setup";
import { saveCourse, setCourseStatus, deleteCourse, saveLesson, reorderLessons, setCourseAccess, fetchTranscript } from "@/server/content-actions";

describe("F3 · Quản lý khóa học · DEC-037/038/042/046", () => {
  const course = { title: "Security", description: "Training", coverImage: "/api/files/cover.png", categoryId: "cat1" };
  it.each(["title", "description", "coverImage", "categoryId"])("bắt buộc trường %s", async (key) => expect((await saveCourse(null, { ...course, [key]: "" })).ok).toBe(false));
  it("tạo khóa nháp và lưu người cập nhật", async () => { expect((await saveCourse(null, course)).ok).toBe(true); expect(mocks.db.course.create).toHaveBeenCalledWith({ data: { ...course, updatedBy: "Admin" } }); });
  it("từ chối tên khóa trùng", async () => { mocks.db.course.findFirst.mockResolvedValue({ id: "dup" }); expect((await saveCourse(null, course)).ok).toBe(false); expect(mocks.db.course.create).not.toHaveBeenCalled(); });
  it("không xuất bản khóa chưa có bài học", async () => expect((await setCourseStatus("c1", "PUBLISHED")).ok).toBe(false));
  it("xuất bản khóa có bài học", async () => { mocks.db.lesson.count.mockResolvedValue(1); expect((await setCourseStatus("c1", "PUBLISHED")).ok).toBe(true); });
  it("không về nháp khi có người đang làm quiz", async () => { mocks.db.attempt.count.mockResolvedValue(1); expect((await setCourseStatus("c1", "DRAFT")).ok).toBe(false); });
  it("không xóa khóa xuất bản", async () => { mocks.db.course.findUnique.mockResolvedValue({ status: "PUBLISHED" }); expect((await deleteCourse("c1")).ok).toBe(false); });
  it("không xóa khóa nháp đã có lượt làm bài", async () => { mocks.db.course.findUnique.mockResolvedValue({ status: "DRAFT" }); mocks.db.attempt.count.mockResolvedValue(1); expect((await deleteCourse("c1")).ok).toBe(false); });
  it("xóa khóa nháp chưa sử dụng", async () => { mocks.db.course.findUnique.mockResolvedValue({ status: "DRAFT" }); expect((await deleteCourse("c1")).ok).toBe(true); expect(mocks.db.course.delete).toHaveBeenCalledWith({ where: { id: "c1" } }); });
});

describe("F4 · Bài học và nội dung · DEC-047/050/052", () => {
  it("loại script và event handler trước khi lưu bài", async () => {
    await saveLesson("c1", null, { type: "ARTICLE", title: "Lesson", articleBody: '<p onclick="evil()">Safe</p><script>evil()</script>' });
    expect(mocks.db.lesson.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ articleBody: "<p>Safe</p>", position: 1 }) }));
  });
  it("từ chối bài chỉ chứa script", async () => expect((await saveLesson("c1", null, { type: "ARTICLE", title: "Lesson", articleBody: "<script>x()</script>" })).ok).toBe(false));
  it("từ chối video ngoài YouTube/Drive", async () => expect((await saveLesson("c1", null, { type: "VIDEO", title: "Lesson", videoUrl: "https://example.com/video" })).ok).toBe(false));
  it("lưu video YouTube và transcript thủ công", async () => { expect((await saveLesson("c1", null, { type: "VIDEO", title: "Lesson", videoUrl: "https://youtu.be/abc", transcript: "  Nội dung  " })).ok).toBe(true); expect(mocks.db.lesson.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ transcript: "Nội dung", articleBody: null }) })); });
  it("từ chối tên bài trùng trong cùng khóa", async () => { mocks.db.lesson.findFirst.mockResolvedValue({ id: "dup" }); expect((await saveLesson("c1", null, { type: "ARTICLE", title: "Lesson", articleBody: "Text" })).ok).toBe(false); });
  it("sắp xếp bài với vị trí bắt đầu từ 1 và ràng buộc courseId", async () => { await reorderLessons("c1", ["l2", "l1"]); expect(mocks.db.lesson.update).toHaveBeenNthCalledWith(1, { where: { id: "l2", courseId: "c1" }, data: { position: 1 } }); });
  it("transcript tự động báo chưa cấu hình", async () => expect(await fetchTranscript("l1")).toMatchObject({ ok: false, error: expect.stringContaining("HLD-Q7") }));
  it("thay quyền bằng danh sách cá nhân và nhóm", async () => { await setCourseAccess("c1", ["u1"], ["g1"]); expect(mocks.db.courseAccess.deleteMany).toHaveBeenCalledWith({ where: { courseId: "c1" } }); expect(mocks.db.courseAccess.createMany).toHaveBeenCalledWith({ data: [{ courseId: "c1", userId: "u1" }, { courseId: "c1", groupId: "g1" }] }); });
});
