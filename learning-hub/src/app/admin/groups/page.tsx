import TaxonomyClient from "@/components/TaxonomyClient";
import { prisma } from "@/lib/db";
import { displayName } from "@/lib/format";
import { deleteGroup, moveMembers, saveGroup } from "@/server/people-actions";

export default async function GroupsPage() {
  const groups = await prisma.group.findMany({ include: { users: { orderBy: { fullName: "asc" } } }, orderBy: { name: "asc" } });
  return (
    <TaxonomyClient
      kind="group"
      save={saveGroup}
      remove={deleteGroup}
      move={moveMembers}
      rows={groups.map((g) => ({ id: g.id, name: g.name, count: g.users.length, members: g.users.map((u) => ({ id: u.id, name: displayName(u), email: u.email })) }))}
    />
  );
}
