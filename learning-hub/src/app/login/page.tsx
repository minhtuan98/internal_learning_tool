import { redirect } from "next/navigation";
import { devLoginEnabled, getCurrentUser, googleEnabled } from "@/lib/auth";
import { prisma } from "@/lib/db";
import LoginClient from "./LoginClient";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin/dashboard" : "/learn");
  const { error } = await searchParams;
  const dev = devLoginEnabled();
  const users = dev
    ? await prisma.user.findMany({
        orderBy: [{ role: "asc" }, { email: "asc" }],
        select: { email: true, fullName: true, role: true, status: true, group: { select: { name: true } } },
      })
    : [];
  return (
    <LoginClient
      google={googleEnabled()}
      dev={dev}
      error={error}
      users={users.map((u) => ({ email: u.email, name: u.fullName ?? "Chưa đăng nhập lần nào", role: u.role, status: u.status, group: u.group?.name ?? null }))}
    />
  );
}
