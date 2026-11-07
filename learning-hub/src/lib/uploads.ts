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

/** Real image type from the file's first bytes; the browser-declared MIME type can be faked. */
export function sniffImage(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  const b = (i: number) => bytes[i];
  if (bytes.length >= 3 && b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "jpg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b(i) === v)) return "png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

/** Validates and stores an uploaded image. Returns the stored file name. */
export async function saveImage(file: File): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  if (!ALLOWED[file.type]) return { ok: false, error: "Chỉ nhận ảnh JPG, PNG hoặc WebP." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Ảnh vượt quá 2 MB. Hãy chọn ảnh nhỏ hơn." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  // The content must really be a JPG / PNG / WebP image, whatever the declared type says
  const ext = sniffImage(bytes);
  if (!ext) return { ok: false, error: "Tệp không phải ảnh JPG, PNG hoặc WebP hợp lệ." };
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(bytes));
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
