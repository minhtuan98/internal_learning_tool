import { prisma } from "@/lib/db";
import { dashboardStats } from "@/lib/stats";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ course?: string; group?: string; days?: string }> }) {
  const sp = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const [stats, courses, groups] = await Promise.all([
    dashboardStats({ courseId: sp.course, groupId: sp.group, days }),
    prisma.course.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.group.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return <DashboardClient stats={stats} courses={courses} groups={groups} filter={{ course: sp.course ?? null, group: sp.group ?? null, days }} />;
}
