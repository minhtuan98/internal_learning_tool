import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assignmentState, assignmentsForUser, progressForCourses } from "@/lib/access";
import { dashboardStats } from "@/lib/stats";
import { shellUser } from "@/lib/shell";
import { SKIP_WELCOME_COOKIE, homeFor } from "@/lib/welcome";
import WelcomeClient, { type WelcomeStat } from "./WelcomeClient";

/** Welcome screen after sign-in (DESIGN_SYSTEM.md → Screens → Welcome). */
export default async function WelcomePage() {
  const user = await requireUser();
  const skip = (await cookies()).get(SKIP_WELCOME_COOKIE)?.value === "1";
  let stats: WelcomeStat[];
  let next: { label: string; href: string } | null = null;

  if (user.role === "ADMIN") {
    const [s, published, members] = await Promise.all([
      dashboardStats({ days: 30 }),
      prisma.course.count({ where: { status: "PUBLISHED" } }),
      prisma.user.count({ where: { role: "MEMBER", status: "ACTIVE" } }),
    ]);
    stats = [
      { label: "Khóa học đang xuất bản", value: published },
      { label: "Thành viên hoạt động", value: members },
      { label: "Tỷ lệ hoàn thành (30 ngày)", value: s.completion.rate, suffix: "%" },
      { label: "Thành viên quá hạn", value: s.overdueMembers, tone: s.overdueMembers > 0 ? "danger" : undefined, href: "/admin/assignments?tab=overdue" },
    ];
  } else {
    const assignments = await assignmentsForUser(user);
    const progress = await progressForCourses(user.id, [...new Set(assignments.map((a) => a.courseId))]);
    const rows = assignments.map((a) => ({ a, state: assignmentState(progress.get(a.courseId)!, a.deadline) }));
    const open = rows.filter((r) => r.state !== "COMPLETED").sort((x, y) => x.a.deadline.getTime() - y.a.deadline.getTime());
    stats = [
      { label: "Khóa học được giao", value: rows.length },
      { label: "Đang học", value: rows.filter((r) => r.state === "IN_PROGRESS").length },
      { label: "Đã hoàn thành", value: rows.filter((r) => r.state === "COMPLETED").length },
      { label: "Quá hạn", value: rows.filter((r) => r.state === "OVERDUE").length, tone: rows.some((r) => r.state === "OVERDUE") ? "danger" : undefined, href: "/learn" },
    ];
    if (open[0]) next = { label: open[0].a.course.title, href: `/learn/courses/${open[0].a.courseId}` };
  }

  return <WelcomeClient user={shellUser(user)} home={homeFor(user.role)} stats={stats} next={next} skip={skip} />;
}
