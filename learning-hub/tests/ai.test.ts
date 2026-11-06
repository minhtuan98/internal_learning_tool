import { describe, it, expect, vi } from "vitest";
import { mocks } from "./setup";
const api = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error { status = 500; }
  class Anthropic {
    beta = { messages: { create: api.create } };
    static APIError = APIError;
    static AuthenticationError = class extends APIError {};
    static RateLimitError = class extends APIError {};
    static APIConnectionError = class extends APIError {};
  }
  return { default: Anthropic };
});
import { generateQuestions } from "@/lib/ai";

describe("F5 · Dịch vụ AI tạo câu hỏi", () => {
  const lessons = [{ title: "Security", text: "Mọi nhân viên phải báo cáo sự cố bảo mật ngay cho bộ phận IT. Không được chia sẻ mật khẩu tài khoản công ty cho bất kỳ ai." }];
  it("thiếu API key dùng câu hỏi mẫu và ghi log", async () => { vi.stubEnv("ANTHROPIC_API_KEY", ""); vi.stubEnv("ANTHROPIC_AUTH_TOKEN", ""); const r = await generateQuestions("q1", lessons, 2); expect(r.ok).toBe(true); if (r.ok) { expect(r.mode).toBe("sample"); expect(r.questions[0].text).toContain("Câu hỏi mẫu"); expect(r.questions[0].options).toHaveLength(4); } expect(api.create).not.toHaveBeenCalled(); expect(mocks.db.aiCallLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ model: "sample-generator", status: "OK" }) }); });
  it("nguồn quá ngắn không tạo câu mẫu bịa", async () => { vi.stubEnv("ANTHROPIC_API_KEY", ""); vi.stubEnv("ANTHROPIC_AUTH_TOKEN", ""); expect((await generateQuestions("q1", [{ title: "Short", text: "Tiny" }], 3)).ok).toBe(false); });
  function response(text: string, stop_reason = "end_turn") { return { model: "test-model", usage: { input_tokens: 12, output_tokens: 25 }, stop_reason, content: [{ type: "text", text }] }; }
  it("AI từ chối được ghi log REFUSED", async () => { vi.stubEnv("ANTHROPIC_API_KEY", "test-only"); api.create.mockResolvedValue(response("", "refusal")); expect((await generateQuestions("q1", lessons, 2)).ok).toBe(false); expect(mocks.db.aiCallLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "REFUSED" }) }); });
  it.each(["invalid JSON", '{"questions":[]}', '{"questions":[{"text":"Question?","options":["A"],"correct_index":9,"explanation":""}]}'])("loại đầu ra AI sai schema %#", async (text) => { vi.stubEnv("ANTHROPIC_API_KEY", "test-only"); api.create.mockResolvedValue(response(text)); expect((await generateQuestions("q1", lessons, 2)).ok).toBe(false); expect(mocks.db.aiCallLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "ERROR" }) }); });
  it("chấp nhận đầu ra có đúng 4 đáp án và lưu token usage", async () => { vi.stubEnv("ANTHROPIC_API_KEY", "test-only"); api.create.mockResolvedValue(response(JSON.stringify({ questions: [{ text: "Cần báo cáo cho ai?", options: ["IT", "HR", "Sales", "Nobody"], correct_index: 0, explanation: "Theo bài học" }] }))); const r = await generateQuestions("q1", lessons, 1); expect(r).toMatchObject({ ok: true, mode: "claude" }); expect(mocks.db.aiCallLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ inputTokens: 12, outputTokens: 25, questionCount: 1 }) }); });
  it("mất kết nối trả lỗi rõ ràng", async () => { vi.stubEnv("ANTHROPIC_API_KEY", "test-only"); api.create.mockRejectedValue(new Error("network")); expect((await generateQuestions("q1", lessons, 1)).ok).toBe(false); });
});
