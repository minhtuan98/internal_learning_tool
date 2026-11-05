import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "./db";
import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt, QUESTION_JSON_SCHEMA } from "@/prompts/question-generation.v1";

export const AI_MODEL = "claude-opus-5-5";

const QuestionSchema = z.object({
  text: z.string().min(5),
  options: z.array(z.string().min(1)).length(4),
  correct_index: z.number().int().min(0).max(3),
  explanation: z.string(),
});
const OutputSchema = z.object({ questions: z.array(QuestionSchema).min(1) });
export type DraftQuestion = z.infer<typeof QuestionSchema>;

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

type GenResult = { ok: true; questions: DraftQuestion[]; logId: string; mode: "claude" | "sample" } | { ok: false; error: string };

/**
 * AI module (HLD §2): builds the prompt, calls the model, validates the output against a schema,
 * and logs every call (HLD §6). The LLM only drafts questions; admins approve before use.
 */
export async function generateQuestions(quizId: string, lessons: { title: string; text: string }[], count: number): Promise<GenResult> {
  const started = Date.now();
  if (!aiConfigured()) {
    const questions = sampleQuestions(lessons, count);
    const log = await prisma.aiCallLog.create({
      data: { quizId, model: "sample-generator", promptVersion: PROMPT_VERSION, status: "OK", durationMs: Date.now() - started, questionCount: questions.length },
    });
    if (questions.length === 0) return { ok: false, error: "Nội dung bài học quá ngắn để tạo câu hỏi mẫu." };
    return { ok: true, questions, logId: log.id, mode: "sample" };
  }

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: QUESTION_JSON_SCHEMA as unknown as Record<string, unknown> },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(lessons, count) }],
    });

    const base = {
      quizId,
      model: response.model,
      promptVersion: PROMPT_VERSION,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      durationMs: Date.now() - started,
    };
    if (response.stop_reason === "refusal") {
      await prisma.aiCallLog.create({ data: { ...base, status: "REFUSED", error: "refusal" } });
      return { ok: false, error: "AI từ chối tạo câu hỏi cho nội dung này. Hãy thử chọn bài học khác." };
    }
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const parsed = OutputSchema.safeParse(safeJson(text));
    if (!parsed.success) {
      await prisma.aiCallLog.create({ data: { ...base, status: "ERROR", error: "schema validation failed" } });
      return { ok: false, error: "Kết quả AI không đúng định dạng nên đã bị loại. Hãy thử lại." };
    }
    const log = await prisma.aiCallLog.create({ data: { ...base, status: "OK", questionCount: parsed.data.questions.length } });
    return { ok: true, questions: parsed.data.questions, logId: log.id, mode: "claude" };
  } catch (err) {
    const msg =
      err instanceof Anthropic.AuthenticationError
        ? "Khóa API của AI không hợp lệ."
        : err instanceof Anthropic.RateLimitError
          ? "AI đang quá tải, hãy thử lại sau ít phút."
          : err instanceof Anthropic.APIConnectionError
            ? "Không kết nối được tới dịch vụ AI."
            : err instanceof Anthropic.APIError
              ? `Dịch vụ AI báo lỗi (${err.status}).`
              : "Có lỗi khi gọi AI.";
    await prisma.aiCallLog.create({
      data: { quizId, model: AI_MODEL, promptVersion: PROMPT_VERSION, status: "ERROR", durationMs: Date.now() - started, error: String(err).slice(0, 500) },
    });
    return { ok: false, error: `${msg} Bạn có thể thử lại.` };
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Sample generator used when no AI key is configured, so the review flow can be tried locally.
 * Questions are clearly labelled as samples in the UI.
 */
function sampleQuestions(lessons: { title: string; text: string }[], count: number): DraftQuestion[] {
  const facts = lessons.flatMap((l) =>
    l.text
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 30 && s.length <= 220)
      .map((s) => ({ lesson: l.title, s })),
  );
  const fillers = [
    "Chỉ cần đổi mật khẩu khi được bộ phận IT yêu cầu.",
    "Có thể chia sẻ tài khoản công ty cho đồng nghiệp thân thiết.",
    "Không cần báo cáo sự cố nếu đã tự khắc phục được.",
    "Mọi email có logo công ty đều an toàn để mở tệp đính kèm.",
    "Dữ liệu khách hàng có thể lưu trên thiết bị cá nhân để tiện làm việc.",
  ];
  const out: DraftQuestion[] = [];
  for (let i = 0; i < facts.length && out.length < count; i++) {
    const f = facts[i];
    const distractors = [...fillers.filter((x) => x !== f.s)].sort(() => Math.random() - 0.5).slice(0, 3);
    const correct = Math.floor(Math.random() * 4);
    const options = [...distractors];
    options.splice(correct, 0, f.s);
    out.push({
      text: `[Câu hỏi mẫu] Theo bài "${f.lesson}", nhận định nào sau đây là đúng?`,
      options,
      correct_index: correct,
      explanation: `Bài "${f.lesson}" nêu: "${f.s}"`,
    });
  }
  return out;
}
