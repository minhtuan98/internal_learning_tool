import { AdminShell } from "@/components/Shells";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { shellUser } from "@/lib/shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const count = await prisma.user.count({ where: { status: "ACTIVE" } });
  return (
    <AdminShell user={shellUser(user)} memberCount={count}>
      {children}
    </AdminShell>
  );
}
