import { describe, it, expect } from "vitest";
import { toEmbedUrl } from "@/lib/video";
import { sanitizeArticle, htmlToText } from "@/lib/sanitize";
import { fmtDuration, pct, initials, displayName } from "@/lib/format";
import { parseOptions } from "@/lib/types";
import { readUpload, saveImage, MAX_IMAGE_BYTES } from "@/lib/uploads";
import { buildUserPrompt } from "@/prompts/question-generation.v1";

describe("F4 · Video, nội dung và upload", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abc", "https://www.youtube.com/embed/abc"], ["https://youtu.be/abc", "https://www.youtube.com/embed/abc"],
    ["https://www.youtube.com/shorts/abc", "https://www.youtube.com/embed/abc"], ["https://drive.google.com/file/d/xyz/view", "https://drive.google.com/file/d/xyz/preview"],
    ["https://drive.google.com/open?id=xyz", "https://drive.google.com/file/d/xyz/preview"], ["not a URL", null], ["https://example.test/video", null],
  ])("chuyển video %s", (url, expected) => expect(toEmbedUrl(url!)).toBe(expected));
  it("loại javascript link", () => expect(sanitizeArticle('<a href="javascript:alert(1)">link</a>')).not.toContain("javascript:"));
  it("chỉ giữ ảnh từ route upload nội bộ", () => { const result = sanitizeArticle('<img src="https://evil.test/x.png"><img src="/api/files/a.png" alt="A">'); expect(result).not.toContain("evil.test"); expect(result).toContain("/api/files/a.png"); });
  it("link mở tab mới có noopener", () => expect(sanitizeArticle('<a href="https://example.test">link</a>')).toContain('rel="noopener noreferrer"'));
  it("chuyển HTML thành text cho AI", () => expect(htmlToText("<p>Hello</p><p>World</p>")).toBe("Hello\nWorld"));
  it.each(["../secret.env", "../../.env", "x.html", "/etc/passwd"])("chặn tên upload %s", async (name) => expect(await readUpload(name)).toBeNull());
  it("từ chối SVG upload", async () => expect((await saveImage(new File(["svg"], "x.svg", { type: "image/svg+xml" }))).ok).toBe(false));
  it("từ chối ảnh trên 2MB", async () => expect((await saveImage(new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "x.png", { type: "image/png" }))).ok).toBe(false));
});

describe("F9 · Định dạng kết quả", () => {
  it.each([[0, 0, 0], [1, 3, 33], [2, 2, 100]])("tỷ lệ %s/%s", (n, d, result) => expect(pct(n, d)).toBe(result));
  it("thời lượng âm hiển thị 0", () => expect(fmtDuration(-100)).toBe("00 phút 00 giây"));
  it("thời lượng làm tròn giây", () => expect(fmtDuration(61_500)).toBe("01 phút 02 giây"));
  it("avatar dùng hai từ cuối của tên", () => expect(initials("Nguyễn Minh Anh")).toBe("MA"));
  it("tên chưa có dùng email", () => expect(displayName({ fullName: null, email: "u@example.test" })).toBe("u@example.test"));
  it.each(["not JSON", "{}", "null"])("đáp án lỗi %s không làm crash", (input) => expect(parseOptions(input)).toEqual([]));
  it("chuyển đáp án sang chuỗi", () => expect(parseOptions('[1,"A"]')).toEqual(["1", "A"]));
});

describe("F5 · Prompt AI", () => {
  it("prompt giữ tài liệu, số câu hỏi và tiêu đề an toàn trong dấu nháy", () => { const prompt = buildUserPrompt([{ title: 'Lesson "A"', text: "Company policy" }], 5); expect(prompt).toContain("Company policy"); expect(prompt).toContain("Write 5 quiz questions"); expect(prompt).toContain('title="Lesson \'A\'"'); });
});
