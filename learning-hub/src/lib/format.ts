import dayjs from "dayjs";

export const fmtDate = (d?: Date | string | null) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");
export const fmtDateTime = (d?: Date | string | null) => (d ? dayjs(d).format("DD/MM/YYYY HH:mm") : "—");
export const fmtShort = (d?: Date | string | null) => (d ? dayjs(d).format("DD/MM · HH:mm") : "—");

export function fmtDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")} phút ${String(r).padStart(2, "0")} giây`;
}

/** Whole days between now and a past deadline. */
export function daysOverdue(deadline: Date | string, now = new Date()) {
  return Math.max(1, Math.ceil((now.getTime() - new Date(deadline).getTime()) / 86_400_000));
}

export function initials(name?: string | null, email?: string) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  const a = parts.length > 1 ? parts[parts.length - 2][0] + parts[parts.length - 1][0] : src.slice(0, 2);
  return a.toUpperCase();
}

export const displayName = (u: { fullName?: string | null; email: string }) => u.fullName || u.email;

export const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);
