import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const me = await requireAdmin();
  const [users, groups] = await Promise.all([
    prisma.user.findMany({ include: { group: true }, orderBy: [{ fullName: "asc" }, { email: "asc" }] }),
    prisma.group.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <UsersClient
      meId={me.id}
      groups={groups.map((g) => ({ id: g.id, name: g.name }))}
      users={users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        status: u.status,
        jobTitle: u.jobTitle,
        employeeCode: u.employeeCode,
        groupId: u.groupId,
        group: u.group?.name ?? null,
        lastSignInAt: u.lastSignInAt,
        avatarUrl: u.avatarUrl,
      }))}
    />
  );
}
