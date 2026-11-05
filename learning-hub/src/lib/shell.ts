import type { CurrentUser } from "./auth";
import { displayName, initials } from "./format";
import type { ShellUser } from "@/components/Shells";

export const shellUser = (u: CurrentUser): ShellUser => ({
  name: displayName(u),
  email: u.email,
  avatarUrl: u.avatarUrl,
  role: u.role === "ADMIN" ? "ADMIN" : "MEMBER",
  initials: initials(u.fullName, u.email),
});
