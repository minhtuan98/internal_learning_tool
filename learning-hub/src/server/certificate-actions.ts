"use server";

import { revalidatePath } from "next/cache";
import { actionAdmin } from "@/lib/auth";
import { fail, type ActionResult } from "@/lib/types";
import { saveCertificateSettings, type CertificateSettings } from "@/lib/certificates";
import { prisma } from "@/lib/db";
import type { NameFormat } from "@/lib/cert-name";

/** Admin: signer and seal text used for certificates issued from now on (issued ones keep their text). */
export async function updateCertificateSettings(input: Omit<CertificateSettings, "nameFormat"> & { nameFormat?: NameFormat }): Promise<ActionResult> {
  const admin = await actionAdmin();
  if (!admin) return fail("Bạn không có quyền thực hiện thao tác này.");
  const clean = {
    signerName: String(input.signerName ?? "").trim(),
    signerTitle: String(input.signerTitle ?? "").trim(),
    sealCode: String(input.sealCode ?? "").trim().toUpperCase(),
    sealLabel: String(input.sealLabel ?? "").trim().toUpperCase(),
    sealRing: String(input.sealRing ?? "").trim(),
    nameFormat: (input.nameFormat && ["FULL", "ASCII", "EMAIL"].includes(input.nameFormat) ? input.nameFormat : "FULL") as NameFormat,
  };
  if (Object.values(clean).some((v) => !v)) return fail("Vui lòng nhập đủ các trường.");
  if (!/^[A-Z0-9-]{1,10}$/.test(clean.sealCode)) return fail("Mã chứng chỉ chỉ gồm chữ in hoa, số hoặc dấu gạch, tối đa 10 ký tự.");
  if (clean.signerName.length > 60 || clean.signerTitle.length > 80 || clean.sealLabel.length > 40 || clean.sealRing.length > 80) return fail("Nội dung quá dài so với khung chứng chỉ.");
  await saveCertificateSettings(clean);
  revalidatePath("/admin/certificates");
  return { ok: true, message: "Đã lưu. Chứng chỉ cấp từ bây giờ sẽ dùng thông tin mới." };
}

/** Admin: correct the recipient name on an issued certificate (number and date stay the same). */
export async function renameCertificate(id: string, name: string): Promise<ActionResult> {
  const admin = await actionAdmin();
  if (!admin) return fail("Bạn không có quyền thực hiện thao tác này.");
  const clean = String(name ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return fail("Vui lòng nhập tên.");
  if (clean.length > 40) return fail("Tên tối đa 40 ký tự để vừa khung chứng chỉ.");
  const cert = await prisma.certificate.findUnique({ where: { id } });
  if (!cert) return fail("Không tìm thấy chứng chỉ.");
  await prisma.certificate.update({ where: { id }, data: { recipientName: clean } });
  revalidatePath(`/certificates/${id}`);
  revalidatePath("/admin/certificates");
  return { ok: true, message: "Đã cập nhật tên trên chứng chỉ." };
}
