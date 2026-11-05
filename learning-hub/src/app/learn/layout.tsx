import { MemberShell } from "@/components/Shells";
import { requireMember } from "@/lib/auth";
import { shellUser } from "@/lib/shell";

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const user = await requireMember();
  return <MemberShell user={shellUser(user)}>{children}</MemberShell>;
}
