import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

/** Bundled seed images (read-only on Vercel). */
const BUNDLED_DIR = path.join(process.cwd(), "data", "uploads");
/** Where new uploads go: /tmp on the Vercel demo (ephemeral), data/uploads locally. */
export const UPLOAD_DIR = process.env.VERCEL ? "/tmp/learning-hub-uploads" : BUNDLED_DIR;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // DEC-045, DEC-053

const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/** Validates and stores an uploaded image. Returns the stored file name. */
export async function saveImage(file: File): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const ext = ALLOWED[file.type];
  if (!ext) return { ok: false, error: "Chỉ nhận ảnh JPG, PNG hoặc WebP." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Ảnh vượt quá 2 MB. Hãy chọn ảnh nhỏ hơn." };
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return { ok: true, name };
}

export async function readUpload(name: string) {
  if (!/^[\w-]+\.(jpg|png|webp|svg)$/.test(name)) return null;
  for (const dir of UPLOAD_DIR === BUNDLED_DIR ? [UPLOAD_DIR] : [UPLOAD_DIR, BUNDLED_DIR]) {
    try {
      return await readFile(path.join(dir, name));
    } catch {
      // try the next directory
    }
  }
  return null;
}

export const fileUrl = (name: string) => `/api/files/${name}`;
