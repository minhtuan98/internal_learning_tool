import { NextResponse } from "next/server";
import { actionAdmin } from "@/lib/auth";
import { fileUrl, saveImage } from "@/lib/uploads";

export async function POST(req: Request) {
  if (!(await actionAdmin())) return NextResponse.json({ ok: false, error: "Bạn không có quyền tải ảnh lên." }, { status: 403 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Không tìm thấy tệp." }, { status: 400 });
  const r = await saveImage(file);
  if (!r.ok) return NextResponse.json(r, { status: 400 });
  return NextResponse.json({ ok: true, name: r.name, url: fileUrl(r.name) });
}
