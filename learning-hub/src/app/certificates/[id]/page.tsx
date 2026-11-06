import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import Certificate from "@/components/Certificate";
import CertificateToolbar from "./CertificateToolbar";

export const metadata: Metadata = { title: "Chứng chỉ · Learning Hub" };

/** Full-size certificate; the owner and admins can open it, print it or save it as PDF. */
export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const cert = await prisma.certificate.findUnique({ where: { id } });
  if (!cert || (user.role !== "ADMIN" && cert.userId !== user.id)) notFound();
  return (
    <div className="lh-cert-page">
      <CertificateToolbar
        back={user.role === "ADMIN" ? "/admin/certificates" : "/learn/certificates"}
        fileName={`${cert.number.replace(/[/.]/g, "-")} ${cert.recipientName}`}
        number={cert.number}
        course={cert.courseTitle}
        rename={user.role === "ADMIN" ? { id: cert.id, name: cert.recipientName } : null}
      />
      <div className="lh-cert-page__sheet">
        <Certificate data={cert} />
      </div>
    </div>
  );
}
