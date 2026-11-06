import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getCertificateSettings, syncCertificates } from "@/lib/certificates";
import { usersWithAccess } from "@/lib/access";
import { displayName } from "@/lib/format";
import CertificatesAdminClient from "./CertificatesAdminClient";

export default async function CertificatesAdminPage() {
  await requireAdmin();
  await syncCertificates(); // back-fill members who completed courses before certificates existed
  const [certs, members, courses, groups, settings] = await Promise.all([
    prisma.certificate.findMany({ orderBy: { completedAt: "desc" } }),
    prisma.user.findMany({ where: { role: "MEMBER" }, include: { group: true }, orderBy: { fullName: "asc" } }),
    prisma.course.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.group.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getCertificateSettings(),
  ]);
  const reach = new Map(await Promise.all(courses.map(async (c) => [c.id, [...(await usersWithAccess(c.id))]] as [string, string[]])));
  return (
    <CertificatesAdminClient
      certs={certs}
      members={members.map((m) => ({ id: m.id, name: displayName(m), fullName: m.fullName, email: m.email, groupId: m.groupId, group: m.group?.name ?? null, status: m.status }))}
      courses={courses.map((c) => ({ ...c, reach: reach.get(c.id) ?? [] }))}
      groups={groups}
      settings={settings}
    />
  );
}
