import { describe, it, expect, vi } from "vitest";
vi.mock("fs/promises", () => ({ mkdir: vi.fn(), writeFile: vi.fn(), readFile: vi.fn() }));
import { writeFile } from "fs/promises";
import { saveImage, sniffImage } from "@/lib/uploads";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const WEBP = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBPVP8 ")]);

describe("F3 · Ảnh tải lên phải là ảnh thật (lỗi Codex 7/11)", () => {
  it("nhận diện đúng PNG / JPG / WebP theo nội dung", () => {
    expect(sniffImage(PNG)).toBe("png");
    expect(sniffImage(JPG)).toBe("jpg");
    expect(sniffImage(WEBP)).toBe("webp");
    expect(sniffImage(new Uint8Array(Buffer.from("hello, not an image")))).toBeNull();
  });
  it("từ chối tệp văn bản giả nhãn image/png, không ghi file", async () => {
    const r = await saveImage(new File(["<script>alert(1)</script>"], "x.png", { type: "image/png" }));
    expect(r.ok).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
  });
  it("lưu ảnh thật với đuôi theo nội dung, không theo nhãn", async () => {
    const r = await saveImage(new File([JPG], "photo.png", { type: "image/png" }));
    expect(r).toMatchObject({ ok: true });
    expect(r.ok && r.name.endsWith(".jpg")).toBe(true);
  });
  it("vẫn từ chối loại không cho phép và ảnh > 2 MB", async () => {
    expect((await saveImage(new File([PNG], "a.gif", { type: "image/gif" }))).ok).toBe(false);
    expect((await saveImage(new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" }))).ok).toBe(false);
  });
});
