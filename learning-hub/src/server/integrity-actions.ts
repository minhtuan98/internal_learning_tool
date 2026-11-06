"use server";

import { revalidatePath } from "next/cache";
import { actionAdmin } from "@/lib/auth";
import { fail, type ActionResult } from "@/lib/types";
import { setMaxViolations } from "@/lib/integrity";

/** Admin: violations allowed per attempt for every quiz; one more voids the attempt. */
export async function updateMaxViolations(n: number): Promise<ActionResult> {
  if (!(await actionAdmin())) return fail("Bạn không có quyền thực hiện thao tác này.");
  if (!Number.isInteger(n) || n < 0 || n > 20) return fail("Số lần vi phạm cho phép từ 0 đến 20.");
  await setMaxViolations(n);
  revalidatePath("/admin/results");
  return { ok: true, message: `Đã lưu: tối đa ${n} lần vi phạm mỗi lượt, áp dụng cho mọi khóa học.` };
}
