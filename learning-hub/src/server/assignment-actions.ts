"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { actionAdmin } from "@/lib/auth";
import { fail, type ActionResult } from "@/lib/types";
import { usersWithAccess } from "@/lib/access";
import { displayName } from "@/lib/format";

type Input = { courseId: string; userIds: string[]; groupIds: string[]; deadline: string };

/** Members reached by an assignment (individuals + current group members). */
async function resolveMembers(userIds: string[], groupIds: string[]) {
  return prisma.user.findMany({
    where: { role: "MEMBER", OR: [{ id: { in: userIds } }, { groupId: { in: groupIds } }] },
    include: { group: true },
    orderBy: { fullName: "asc" },
  });
}

function validate(i: Input) {
  if (!i.courseId) return "Chọn khóa học.";
  if (i.userIds.length + i.groupIds.length === 0) return "Chọn ít nhất 1 người hoặc 1 nhóm.";
  if (!i.deadline || Number.isNaN(Date.parse(i.deadline))) return "Chọn hạn chót.";
  if (new Date(i.deadline) <= new Date()) return "Hạn chót phải ở tương lai.";
  return null;
}

/**
 * Step 1 of assigning: list selected people who cannot open the course (DEC-056),
 * so the admin sees the notification before confirming.
 */
export async function checkAssignmentAccess(i: Input): Promise<ActionResult<{ total: number; missing: { id: string; name: string; email: string; group: string | null }[] }>> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  const err = validate(i);
  if (err) return fail(err);
  const course = await prisma.course.findUnique({ where: { id: i.courseId } });
  if (!course || course.status !== "PUBLISHED") return fail("Chỉ giao được khóa học đã xuất bản.");
  const members = await resolveMembers(i.userIds, i.groupIds);
  if (members.length === 0) return fail("Nhóm được chọn chưa có thành viên nào.");
  const allowed = await usersWithAccess(i.courseId);
  const missing = members
    .filter((m) => !allowed.has(m.id))
    .map((m) => ({ id: m.id, name: displayName(m), email: m.email, group: m.group?.name ?? null }));
  return { ok: true, data: { total: members.length, missing } };
}

/** A whole course with a deadline (DEC-055). */
export async function saveAssignment(id: string | null, i: Input): Promise<ActionResult<{ id: string }>> {
  const admin = await actionAdmin();
  if (!admin) return fail("Bạn không có quyền thực hiện thao tác này.");
  const err = validate(i);
  if (err) return fail(err);
  const targets = [...i.userIds.map((userId) => ({ userId })), ...i.groupIds.map((groupId) => ({ groupId }))];
  let assignmentId = id;
  if (id) {
    await prisma.$transaction([
      prisma.assignmentTarget.deleteMany({ where: { assignmentId: id } }),
      prisma.assignment.update({ where: { id }, data: { courseId: i.courseId, deadline: new Date(i.deadline), targets: { create: targets } } }),
    ]);
  } else {
    assignmentId = (await prisma.assignment.create({ data: { courseId: i.courseId, deadline: new Date(i.deadline), createdById: admin.id, targets: { create: targets } } })).id;
  }
  const n = (await resolveMembers(i.userIds, i.groupIds)).length;
  revalidatePath("/admin/assignments");
  return { ok: true, data: { id: assignmentId! }, message: id ? "Đã lưu thay đổi giao bài." : `Đã giao bài cho ${n} người.` };
}

export async function deleteAssignment(id: string): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  await prisma.assignment.delete({ where: { id } });
  revalidatePath("/admin/assignments");
  return { ok: true, message: "Đã xóa giao bài. Kết quả học tập của thành viên vẫn được giữ." };
}
