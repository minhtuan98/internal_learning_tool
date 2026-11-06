import { prisma } from "./db";
import { progressForCourses } from "./access";
import { formatRecipientName, type NameFormat } from "./cert-name";

/**
 * Certificates of completion (DESIGN_SYSTEM.md → Certificates).
 * A member gets one certificate per course, issued automatically the first time the course is complete
 * (all lessons learned + every published quiz passed, same rule as assignments). Number format follows the
 * paper certificates: "<seq in year>/GCN-<code>.<year>", e.g. 22/GCN-IMS.2026.
 */

export type CertificateSettings = {
  signerName: string;
  signerTitle: string;
  sealCode: string;
  sealLabel: string;
  sealRing: string;
  nameFormat: NameFormat;
};

export const CERT_DEFAULTS: CertificateSettings = {
  signerName: "NGUYEN PHAN QUANG NHAT",
  signerTitle: "Head of Information Security Committee",
  sealCode: "IMS",
  sealLabel: "INTEGRATED MANAGEMENT SYSTEM",
  sealRing: "YOUR SUCCESS IS OUR MISSION - INFORMATION SECURITY IN EVERY ACTIVITY",
  nameFormat: "FULL",
};

const KEYS: Record<keyof CertificateSettings, string> = {
  signerName: "cert.signerName",
  signerTitle: "cert.signerTitle",
  sealCode: "cert.sealCode",
  sealLabel: "cert.sealLabel",
  sealRing: "cert.sealRing",
  nameFormat: "cert.nameFormat",
};

export async function getCertificateSettings(): Promise<CertificateSettings> {
  const rows = await prisma.setting.findMany({ where: { key: { in: Object.values(KEYS) } } });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const out = { ...CERT_DEFAULTS };
  for (const k of Object.keys(KEYS) as (keyof CertificateSettings)[]) {
    const v = byKey.get(KEYS[k]);
    if (v) (out as Record<string, string>)[k] = v;
  }
  return out;
}

export async function saveCertificateSettings(s: CertificateSettings) {
  await prisma.$transaction(
    (Object.keys(KEYS) as (keyof CertificateSettings)[]).map((k) =>
      prisma.setting.upsert({ where: { key: KEYS[k] }, create: { key: KEYS[k], value: s[k] }, update: { value: s[k] } }),
    ),
  );
}

export const certificateNumber = (seq: number, code: string, year: number) => `${seq}/GCN-${code}.${year}`;

/**
 * Issues missing certificates for the given member across the given courses (idempotent).
 * Called after a lesson is completed or a quiz attempt is scored, and when certificate pages load
 * (so courses completed before this feature existed get their certificate too).
 */
export async function issueCertificates(userId: string, courseIds: string[]) {
  if (courseIds.length === 0) return 0;
  const [user, existing] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, fullName: true, email: true } }),
    prisma.certificate.findMany({ where: { userId, courseId: { in: courseIds } }, select: { courseId: true } }),
  ]);
  if (!user || user.role !== "MEMBER") return 0;
  const have = new Set(existing.map((c) => c.courseId));
  const todo = courseIds.filter((id) => !have.has(id));
  if (todo.length === 0) return 0;
  const progress = await progressForCourses(userId, todo);
  const done = todo.filter((id) => progress.get(id)?.complete);
  if (done.length === 0) return 0;
  const [settings, courses] = await Promise.all([
    getCertificateSettings(),
    prisma.course.findMany({ where: { id: { in: done } }, select: { id: true, title: true } }),
  ]);
  let issued = 0;
  for (const c of courses) {
    const completedAt = progress.get(c.id)?.completedAt ?? new Date();
    const year = completedAt.getFullYear();
    // seq is unique per year; retry once if two requests race for the same number
    for (let tries = 0; tries < 3; tries++) {
      const last = await prisma.certificate.findFirst({ where: { year }, orderBy: { seq: "desc" }, select: { seq: true } });
      const seq = (last?.seq ?? 0) + 1;
      try {
        await prisma.certificate.create({
          data: {
            number: certificateNumber(seq, settings.sealCode, year),
            seq,
            year,
            userId,
            courseId: c.id,
            recipientName: formatRecipientName(user, settings.nameFormat),
            courseTitle: c.title,
            completedAt,
            signerName: settings.signerName,
            signerTitle: settings.signerTitle,
            sealCode: settings.sealCode,
            sealLabel: settings.sealLabel,
            sealRing: settings.sealRing,
          },
        });
        issued++;
        break;
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code !== "P2002") throw e;
        // P2002 on (userId, courseId) = someone else issued it already → done
        if (await prisma.certificate.findUnique({ where: { userId_courseId: { userId, courseId: c.id } } })) break;
      }
    }
  }
  return issued;
}

/** Courses a member has activity in (lessons or attempts) — the only ones that can be complete. */
async function startedCourseIds(userIds?: string[]) {
  const where = userIds ? { userId: { in: userIds } } : {};
  const [lp, at] = await Promise.all([
    prisma.lessonProgress.findMany({ where, select: { userId: true, lesson: { select: { courseId: true } } }, distinct: ["userId", "lessonId"] }),
    prisma.attempt.findMany({ where: { ...where, passed: true }, select: { userId: true, quiz: { select: { courseId: true } } } }),
  ]);
  const map = new Map<string, Set<string>>();
  const add = (u: string, c: string) => (map.get(u) ?? map.set(u, new Set()).get(u)!).add(c);
  lp.forEach((r) => add(r.userId, r.lesson.courseId));
  at.forEach((r) => add(r.userId, r.quiz.courseId));
  return map;
}

/** Back-fills certificates for one member, or for everyone when no id is given. */
export async function syncCertificates(userId?: string) {
  const started = await startedCourseIds(userId ? [userId] : undefined);
  let n = 0;
  for (const [uid, courses] of started) n += await issueCertificates(uid, [...courses]);
  return n;
}
