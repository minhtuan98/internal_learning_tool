"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { actionAdmin } from "@/lib/auth";
import { fail, type ActionResult } from "@/lib/types";

const PersonSchema = z.object({
  email: z.email("Email không hợp lệ.").transform((s) => s.trim().toLowerCase()),
  role: z.enum(["ADMIN", "MEMBER"]),
  fullName: z.string().trim().optional().nullable(),
  jobTitle: z.string().trim().min(1, "Nhập chức danh."),
  employeeCode: z.string().trim().min(1, "Nhập mã nhân viên."),
  groupId: z.string().optional().nullable(),
});

/** Add a person to the allowlist (DEC-012, DEC-018, DEC-027, DEC-032). */
export async function savePerson(id: string | null, input: unknown): Promise<ActionResult> {
  const admin = await actionAdmin();
  if (!admin) return fail("Bạn không có quyền thực hiện thao tác này.");
  const p = PersonSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message);
  const d = p.data;
  if (d.role === "MEMBER" && !d.groupId) return fail("Thành viên phải thuộc một nhóm.");
  const groupId = d.role === "MEMBER" ? d.groupId : null;
  const dupEmail = await prisma.user.findFirst({ where: { email: d.email, NOT: id ? { id } : undefined } });
  if (dupEmail) return fail("Email này đã có trong hệ thống.");
  const dupCode = await prisma.user.findFirst({ where: { employeeCode: d.employeeCode, NOT: id ? { id } : undefined } });
  if (dupCode) return fail("Mã nhân viên đã được dùng cho người khác.");
  if (id === admin.id && d.role !== "ADMIN") return fail("Bạn không thể tự bỏ quyền quản trị của mình.");
  const data = { email: d.email, role: d.role, fullName: d.fullName || null, jobTitle: d.jobTitle, employeeCode: d.employeeCode, groupId };
  if (id) await prisma.user.update({ where: { id }, data });
  else await prisma.user.create({ data });
  revalidatePath("/admin/users");
  return { ok: true, message: id ? "Đã lưu thay đổi." : "Đã thêm người dùng. Họ có thể đăng nhập bằng Google ngay." };
}

/** Lock / unlock an account; results are kept (DEC-028). */
export async function setUserStatus(id: string, status: "ACTIVE" | "LOCKED"): Promise<ActionResult> {
  const admin = await actionAdmin();
  if (!admin) return fail("Bạn không có quyền thực hiện thao tác này.");
  if (id === admin.id) return fail("Bạn không thể tự khóa tài khoản của mình.");
  await prisma.user.update({ where: { id }, data: { status } });
  revalidatePath("/admin/users");
  return { ok: true, message: status === "LOCKED" ? "Đã khóa tài khoản. Kết quả học tập vẫn được giữ." : "Đã mở khóa tài khoản." };
}

export async function saveGroup(id: string | null, name: string): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  const n = name.trim();
  if (!n) return fail("Nhập tên nhóm.");
  const dup = await prisma.group.findFirst({ where: { name: n, NOT: id ? { id } : undefined } });
  if (dup) return fail("Tên nhóm đã tồn tại."); // DEC-036
  if (id) await prisma.group.update({ where: { id }, data: { name: n } });
  else await prisma.group.create({ data: { name: n } });
  revalidatePath("/admin/groups");
  return { ok: true, message: id ? "Đã đổi tên nhóm." : "Đã tạo nhóm." };
}

export async function deleteGroup(id: string): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  const members = await prisma.user.count({ where: { groupId: id } });
  if (members > 0) return fail(`Nhóm còn ${members} thành viên. Chuyển họ sang nhóm khác trước khi xóa.`); // DEC-034
  await prisma.group.delete({ where: { id } });
  revalidatePath("/admin/groups");
  return { ok: true, message: "Đã xóa nhóm." };
}

/** Move members into a group; group-based access follows at once (DEC-033). */
export async function moveMembers(userIds: string[], groupId: string): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  await prisma.user.updateMany({ where: { id: { in: userIds }, role: "MEMBER" }, data: { groupId } });
  revalidatePath("/admin/groups");
  revalidatePath("/admin/users");
  return { ok: true, message: "Đã chuyển nhóm. Quyền truy cập theo nhóm được cập nhật ngay." };
}

export async function saveCategory(id: string | null, name: string): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  const n = name.trim();
  if (!n) return fail("Nhập tên danh mục.");
  const dup = await prisma.category.findFirst({ where: { name: n, NOT: id ? { id } : undefined } });
  if (dup) return fail("Tên danh mục đã tồn tại."); // DEC-043
  if (id) await prisma.category.update({ where: { id }, data: { name: n } });
  else await prisma.category.create({ data: { name: n } });
  revalidatePath("/admin/categories");
  return { ok: true, message: id ? "Đã đổi tên danh mục." : "Đã tạo danh mục." };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  const used = await prisma.course.count({ where: { categoryId: id } });
  if (used > 0) return fail(`Danh mục đang được ${used} khóa học sử dụng nên chưa xóa được.`); // DEC-044
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
  return { ok: true, message: "Đã xóa danh mục." };
}
