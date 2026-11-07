import { randomInt } from "crypto";
import { prisma } from "./db";

/**
 * Quiz integrity (anti-cheat), decided with the product owner on 2026-11-06 (DESIGN_SYSTEM.md → Quiz integrity):
 * - every attempt gets its own question order and option order (sharing "Q3 = B" is useless);
 * - leaving the quiz (tab / app), copy, right-click, print, Print Screen = a violation, counted per attempt;
 * - more violations than the admin's threshold (one global setting) voids the attempt: 0 points, attempt used;
 * - per-question right/wrong is shown only after an admin releases it for that quiz;
 * - signals that should not block anyone (several tabs/devices, same network, too fast, identical answers)
 *   are only flagged for admins.
 */

/** Violations the quiz page may report. LEFT_PAGE is detected by the server when the member comes back. */
export const VIOLATION_TYPES = ["TAB_HIDDEN", "WINDOW_BLUR", "COPY", "CONTEXT_MENU", "PRINT", "PRINT_SCREEN", "DEVTOOLS"] as const;
export type ViolationType = (typeof VIOLATION_TYPES)[number];

export const EVENT_LABEL: Record<string, string> = {
  TAB_HIDDEN: "Chuyển tab / thu nhỏ",
  WINDOW_BLUR: "Chuyển sang ứng dụng khác",
  COPY: "Sao chép nội dung",
  CONTEXT_MENU: "Chuột phải",
  PRINT: "In trang",
  PRINT_SCREEN: "Phím chụp màn hình",
  DEVTOOLS: "Mở công cụ nhà phát triển",
  LEFT_PAGE: "Đóng / tải lại / rời trang bài thi rồi quay lại",
  MULTI_SESSION: "Mở lượt thi ở tab/thiết bị khác",
  VOIDED: "Hủy lượt do vượt ngưỡng",
};

const MAX_KEY = "quiz.maxViolations";
export const DEFAULT_MAX_VIOLATIONS = 3;

/** Violations allowed per attempt; the next one voids the attempt. */
export async function getMaxViolations() {
  const row = await prisma.setting.findUnique({ where: { key: MAX_KEY } });
  const n = row ? Number(row.value) : DEFAULT_MAX_VIOLATIONS;
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_MAX_VIOLATIONS;
}

export async function setMaxViolations(n: number) {
  await prisma.setting.upsert({ where: { key: MAX_KEY }, create: { key: MAX_KEY, value: String(n) }, update: { value: String(n) } });
}

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Question order + per-question option order for a new attempt (stored as JSON on the attempt). */
export function buildOrder(questions: { id: string; optionCount: number }[]) {
  const questionOrder = shuffled(questions.map((q) => q.id));
  const optionOrders: Record<string, number[]> = {};
  for (const q of questions) optionOrders[q.id] = shuffled([...Array(q.optionCount).keys()]);
  return { questionOrder: JSON.stringify(questionOrder), optionOrders: JSON.stringify(optionOrders) };
}

function parse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export const readOptionOrders = (a: { optionOrders?: string | null }) => parse<Record<string, number[]>>(a.optionOrders, {});
export const readQuestionOrder = (a: { questionOrder?: string | null }) => parse<string[]>(a.questionOrder, []);

/** Display slot chosen in the browser → original option index stored and scored on the server. */
export function toOriginalIndex(a: { optionOrders?: string | null }, questionId: string, slot: number) {
  const perm = readOptionOrders(a)[questionId];
  return perm && perm[slot] !== undefined ? perm[slot] : slot;
}

/** Original option index → display slot (to restore saved answers in the shuffled view). */
export function toDisplaySlot(a: { optionOrders?: string | null }, questionId: string, original: number) {
  const perm = readOptionOrders(a)[questionId];
  const slot = perm ? perm.indexOf(original) : original;
  return slot >= 0 ? slot : original;
}

/** Questions in this attempt's order (questions approved after the start go last), options permuted. */
export function orderForAttempt<Q extends { id: string; options: string[] }>(a: { questionOrder?: string | null; optionOrders?: string | null }, questions: Q[]): Q[] {
  const order = readQuestionOrder(a);
  const rank = new Map(order.map((id, i) => [id, i]));
  const perms = readOptionOrders(a);
  return [...questions]
    .sort((x, y) => (rank.get(x.id) ?? 1e6) - (rank.get(y.id) ?? 1e6))
    .map((q) => {
      const perm = perms[q.id];
      return perm && perm.length === q.options.length ? { ...q, options: perm.map((i) => q.options[i]) } : q;
    });
}

/** Ends an attempt that went over the threshold: 0 points, not passed, the attempt stays used. */
export async function voidAttempt(attemptId: string) {
  const now = new Date();
  await prisma.$transaction([
    prisma.attempt.update({ where: { id: attemptId }, data: { status: "SUBMITTED", voided: true, submittedAt: now, score: 0, passed: false, correctCount: 0 } }),
    prisma.attemptEvent.create({ data: { attemptId, type: "VOIDED", violation: false } }),
  ]);
}

type ClientInfo = { ip: string | null; userAgent: string | null };

/**
 * Logs one event. Counted violations add 1 to the attempt and void it above the admin threshold;
 * signal-only events (counted = false, e.g. leaving while a warning is open) are just logged for admins.
 */
export async function recordViolation(attemptId: string, type: string, durationMs: number | null, info: ClientInfo, counted = true) {
  const max = await getMaxViolations();
  if (!counted) {
    await prisma.attemptEvent.create({ data: { attemptId, type, violation: false, durationMs, ...info } });
    const a = await prisma.attempt.findUnique({ where: { id: attemptId }, select: { violations: true } });
    return { count: a?.violations ?? 0, max, voided: false };
  }
  const [, updated] = await prisma.$transaction([
    prisma.attemptEvent.create({ data: { attemptId, type, durationMs, ...info } }),
    prisma.attempt.update({ where: { id: attemptId }, data: { violations: { increment: 1 } } }),
  ]);
  const voided = updated.violations > max;
  if (voided) await voidAttempt(attemptId);
  return { count: updated.violations, max, voided };
}

/** A reload shorter than this is not "leaving the quiz". */
export const LEFT_PAGE_MS = 3000;
/** No heartbeat for this long (heartbeat = 10 s) means the page was gone even if no beacon arrived. */
export const STALE_MS = 25_000;

/**
 * Runs when the quiz page is (re)opened. If the member closed / reloaded / left the page (beacon → leftAt,
 * or heartbeats stopped) for ≥ 3 s, that counts as LEFT_PAGE. Returns the warning to show, if any.
 */
export async function checkReturn(a: { id: string; status: string; leftAt: Date | null; lastSeenAt: Date | null }, info: ClientInfo, now = new Date()) {
  if (a.status !== "IN_PROGRESS") return null;
  const stale = a.lastSeenAt && now.getTime() - a.lastSeenAt.getTime() > STALE_MS ? a.lastSeenAt : null;
  const from = a.leftAt ?? stale;
  // The previous tab is gone, so the reopened tab takes over its token (no "several tabs" flag)
  await prisma.attempt.update({ where: { id: a.id }, data: { leftAt: null, lastSeenAt: now, ...(from ? { sessionToken: null } : {}) } });
  if (!from) return null;
  const away = now.getTime() - from.getTime();
  if (away < LEFT_PAGE_MS) return null;
  return { type: "LEFT_PAGE", ...(await recordViolation(a.id, "LEFT_PAGE", away, info)) };
}

export type IntegrityFlag = "MULTI_SESSION" | "SAME_NETWORK" | "TOO_FAST" | "IDENTICAL";
export const FLAG_LABEL: Record<IntegrityFlag, string> = {
  MULTI_SESSION: "Nhiều tab/thiết bị",
  SAME_NETWORK: "Cùng mạng, cùng lúc",
  TOO_FAST: "Nộp quá nhanh",
  IDENTICAL: "Đáp án giống hệt người khác",
};
export const SECONDS_PER_QUESTION_MIN = 5;

type FlagAttempt = {
  id: string;
  userId: string;
  quizId: string;
  status: string;
  ip: string | null;
  startedAt: Date;
  submittedAt: Date | null;
  deadlineAt: Date;
  totalCount: number | null;
  answers: { questionId: string; selectedIndex: number }[];
  events: { type: string }[];
};

/** Anomaly flags for admins (never block anyone). */
export function computeFlags(attempts: FlagAttempt[]) {
  const flags = new Map<string, { flag: IntegrityFlag; with?: string[] }[]>();
  const add = (id: string, flag: IntegrityFlag, other?: string) => {
    const list = flags.get(id) ?? flags.set(id, []).get(id)!;
    const cur = list.find((f) => f.flag === flag);
    if (cur) {
      if (other && !cur.with?.includes(other)) (cur.with ??= []).push(other);
    } else list.push({ flag, with: other ? [other] : undefined });
  };
  const end = (a: FlagAttempt) => (a.submittedAt ?? a.deadlineAt).getTime();
  const key = (a: FlagAttempt) => a.answers.map((x) => `${x.questionId}:${x.selectedIndex}`).sort().join("|");
  for (const a of attempts) {
    if (a.events.some((e) => e.type === "MULTI_SESSION")) add(a.id, "MULTI_SESSION");
    const n = a.totalCount ?? a.answers.length;
    if (a.status === "SUBMITTED" && a.submittedAt && n >= 3 && a.answers.length > 0 && (a.submittedAt.getTime() - a.startedAt.getTime()) / 1000 < n * SECONDS_PER_QUESTION_MIN) add(a.id, "TOO_FAST");
  }
  for (let i = 0; i < attempts.length; i++) {
    for (let j = i + 1; j < attempts.length; j++) {
      const a = attempts[i];
      const b = attempts[j];
      if (a.quizId !== b.quizId || a.userId === b.userId) continue;
      const overlap = a.startedAt.getTime() < end(b) && b.startedAt.getTime() < end(a);
      if (overlap && a.ip && a.ip === b.ip) {
        add(a.id, "SAME_NETWORK", b.userId);
        add(b.id, "SAME_NETWORK", a.userId);
      }
      if (a.status === "SUBMITTED" && b.status === "SUBMITTED" && a.answers.length >= 5 && a.answers.length === b.answers.length && key(a) === key(b)) {
        add(a.id, "IDENTICAL", b.userId);
        add(b.id, "IDENTICAL", a.userId);
      }
    }
  }
  return flags;
}

/** Admin "Giám sát thi": attempts with violations, a void or a flag, with their event log. */
export async function integrityRows(filter: { courseId?: string; quizId?: string; groupId?: string }) {
  const quizWhere = { ...(filter.quizId ? { quizId: filter.quizId } : {}), ...(filter.courseId ? { quiz: { courseId: filter.courseId } } : {}) };
  // Flags compare people across groups, so they are computed on every attempt of the quizzes in scope.
  const attempts = await prisma.attempt.findMany({
    where: quizWhere,
    include: {
      user: { include: { group: true } },
      quiz: { select: { title: true, course: { select: { title: true } } } },
      events: { orderBy: { createdAt: "asc" } },
      answers: { select: { questionId: true, selectedIndex: true } },
    },
    orderBy: { startedAt: "desc" },
  });
  const flags = computeFlags(attempts);
  const nameOf = new Map(attempts.map((a) => [a.userId, a.user.fullName || a.user.email]));
  const inScope = attempts.filter((a) => !filter.groupId || a.user.groupId === filter.groupId);
  const rows = inScope
    .filter((a) => a.violations > 0 || a.voided || flags.has(a.id) || a.events.length > 0)
    .map((a) => ({
      id: a.id,
      name: a.user.fullName || a.user.email,
      email: a.user.email,
      group: a.user.group?.name ?? null,
      quiz: a.quiz.title,
      course: a.quiz.course.title,
      number: a.number,
      status: a.status,
      score: a.score,
      voided: a.voided,
      violations: a.violations,
      ip: a.ip,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      flags: (flags.get(a.id) ?? []).map((f) => ({ flag: f.flag, label: FLAG_LABEL[f.flag], with: (f.with ?? []).map((u) => nameOf.get(u) ?? u) })),
      events: a.events.map((e) => ({ id: e.id, type: e.type, label: EVENT_LABEL[e.type] ?? e.type, violation: e.violation, durationMs: e.durationMs, ip: e.ip, at: e.createdAt })),
    }));
  return {
    rows,
    summary: {
      attempts: inScope.length,
      withViolations: inScope.filter((a) => a.violations > 0).length,
      voided: inScope.filter((a) => a.voided).length,
      flagged: inScope.filter((a) => flags.has(a.id)).length,
    },
  };
}
