// Versioned prompt for AI quiz-question generation (HLD §6 principle 5).
// Change the text => bump PROMPT_VERSION so AI call logs stay comparable.

export const PROMPT_VERSION = "qgen-v1";

export const SYSTEM_PROMPT = `You write quiz questions for an internal company training platform.
An admin will review every question before members see it, so accuracy matters more than volume.

Rules:
- Use only facts stated in the lesson material provided. Do not add outside knowledge.
- Each question is single-choice with exactly 4 options and exactly one correct option.
- Distractors must be plausible for someone who skimmed the material, but clearly wrong for someone who studied it.
- Test understanding and application, not trivia such as exact wording or numbering.
- Do not use "all of the above" or "none of the above".
- Write the questions, options and explanations in the same language as the lesson material.
- The explanation (1-2 sentences) says why the correct option is right, citing the lesson.
- Vary the position of the correct option.`;

export function buildUserPrompt(lessons: { title: string; text: string }[], count: number) {
  const material = lessons
    .map((l, i) => `<lesson index="${i + 1}" title="${l.title.replace(/"/g, "'")}">\n${l.text}\n</lesson>`)
    .join("\n\n");
  return `${material}\n\nWrite ${count} quiz questions covering the lessons above. Spread the questions across all lessons.`;
}

export const QUESTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correct_index: { type: "integer" },
          explanation: { type: "string" },
        },
        required: ["text", "options", "correct_index", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;
