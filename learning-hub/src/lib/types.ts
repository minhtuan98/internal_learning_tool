export type Role = "ADMIN" | "MEMBER";
export type UserStatus = "ACTIVE" | "LOCKED";
export type CourseStatus = "DRAFT" | "PUBLISHED";
export type LessonType = "ARTICLE" | "VIDEO";
export type QuizStatus = "DRAFT" | "PUBLISHED";
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED";

/** Result returned by every server action. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function parseOptions(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
