import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { syncCertificates } from "@/lib/certificates";
import MyCertificatesClient from "./MyCertificatesClient";

export default async function MyCertificatesPage() {
  const user = await requireMember();
  await syncCertificates(user.id); // courses finished before certificates existed get theirs here
  const certs = await prisma.certificate.findMany({ where: { userId: user.id }, orderBy: { completedAt: "desc" } });
  return <MyCertificatesClient certs={certs} />;
}
