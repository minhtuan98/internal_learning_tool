"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar, Button, Dropdown, Flex, Layout, Tag, Tooltip, Typography } from "antd";
import { LogoutOutlined, MoonOutlined, SmileOutlined, SunOutlined } from "@ant-design/icons";
import { useThemeMode } from "./Providers";
import { CrumbTrail, HeaderCrumbsProvider } from "./ui";
import ParticleLogo from "./ParticleLogo";
import { BRAND } from "@/lib/brand";

const { Content } = Layout;
const { Text } = Typography;

export type ShellUser = { name: string; email: string; avatarUrl: string | null; role: "ADMIN" | "MEMBER"; initials: string };

/** Saigon Technology "S" mark drawn in particles (assembles on load, scatters under the pointer) + product name. */
function Logo({ href }: { href: string }) {
  const { mode } = useThemeMode();
  return (
    <Link href={href} aria-label={`Learning Hub · ${BRAND.company}`}>
      <Flex align="center" gap={10}>
        <ParticleLogo width={28} height={38} count={260} dot={1.15} steps={[{ kind: "mark" }]} repel={16} ink={mode === "dark" ? "#F2F8FB" : "#102030"} ariaLabel={BRAND.company} />
        <span style={{ display: "grid", lineHeight: 1.15 }}>
          <Text strong className="lh-display" style={{ fontSize: 16 }}>
            Learning <span className="lh-accent-text">Hub</span>
          </Text>
          <Text type="secondary" style={{ fontSize: 11, letterSpacing: 0.3 }}>{BRAND.company}</Text>
        </span>
      </Flex>
    </Link>
  );
}

export function ThemeToggle() {
  const { mode, toggle } = useThemeMode();
  return (
    <Tooltip title="Đổi giao diện sáng / tối">
      <Button icon={mode === "light" ? <SunOutlined /> : <MoonOutlined />} onClick={toggle}>
        {mode === "light" ? "Sáng" : "Tối"}
      </Button>
    </Tooltip>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };
  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          {
            key: "info",
            disabled: true,
            label: (
              <div style={{ padding: "4px 0" }}>
                <Text strong style={{ display: "block" }}>{user.name}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{user.email}</Text>
                <div style={{ marginTop: 6 }}>
                  <Tag color={user.role === "ADMIN" ? "cyan" : "default"}>{user.role === "ADMIN" ? "Quản trị viên" : "Thành viên"}</Tag>
                </div>
              </div>
            ),
          },
          { type: "divider" },
          { key: "welcome", icon: <SmileOutlined />, label: <Link href="/welcome">Màn chào mừng</Link> },
          { key: "logout", icon: <LogoutOutlined />, label: "Đăng xuất", onClick: logout },
        ],
      }}
    >
      <Button type="text" style={{ height: 36, paddingInline: 6 }}>
        <Flex align="center" gap={8}>
          <Avatar size={26} src={user.avatarUrl ?? undefined}>{user.initials}</Avatar>
          <Text>{user.name}</Text>
        </Flex>
      </Button>
    </Dropdown>
  );
}

const ADMIN_NAV = [
  { key: "/admin/dashboard", label: "Tổng quan" },
  { key: "/admin/courses", label: "Khóa học" },
  { key: "/admin/assignments", label: "Giao bài" },
  { key: "/admin/users", label: "Người dùng" },
  { key: "/admin/groups", label: "Nhóm" },
  { key: "/admin/categories", label: "Danh mục" },
  { key: "/admin/results", label: "Kết quả" },
  { key: "/admin/certificates", label: "Chứng chỉ" },
];

/**
 * "Night Glow" shell: no sider. A frosted pill nav floats at the top centre (logo left, account right),
 * the active item carries a breathing glow. Breadcrumb moves into the page, above the title.
 */
function TopBar({ home, nav, active, user }: { home: string; nav: { key: string; label: string }[]; active: string; user: ShellUser }) {
  return (
    <header className="ng-topbar">
      <div className="ng-topbar__side"><Logo href={home} /></div>
      <nav className="ng-pillnav" aria-label="Điều hướng chính">
        {nav.map((n) => (
          <Link key={n.key} href={n.key} className={`ng-pillnav__item${n.key === active ? " is-active" : ""}`} aria-current={n.key === active ? "page" : undefined}>
            {n.key === active && <span className="ng-pillnav__glow" aria-hidden />}
            <span className="ng-pillnav__label">{n.label}</span>
          </Link>
        ))}
      </nav>
      <div className="ng-topbar__side ng-topbar__side--end">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}

export function AdminShell({ user, children }: { user: ShellUser; memberCount: number; children: ReactNode }) {
  const pathname = usePathname();
  const activeNav = ADMIN_NAV.find((n) => pathname.startsWith(n.key)) ?? ADMIN_NAV[0];
  return (
    <HeaderCrumbsProvider fallback={[{ title: "Không gian học tập" }, { title: activeNav.label }]}>
      {(crumbs) => (
        <Layout style={{ minHeight: "100vh" }}>
          <TopBar home="/admin/dashboard" nav={ADMIN_NAV} active={activeNav.key} user={user} />
          <Content className="ng-content">
            <CrumbTrail crumbs={crumbs} style={{ marginBottom: 10 }} />
            {children}
          </Content>
        </Layout>
      )}
    </HeaderCrumbsProvider>
  );
}

export function MemberShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const pathname = usePathname();
  const nav = [
    { key: "/learn", label: "Việc của tôi" },
    { key: "/learn/courses", label: "Khóa học của tôi" },
    { key: "/learn/certificates", label: "Chứng chỉ" },
  ];
  const active = pathname.startsWith("/learn/certificates")
    ? "/learn/certificates"
    : pathname.startsWith("/learn/courses") || pathname.startsWith("/learn/quizzes") || pathname.startsWith("/learn/attempts")
      ? "/learn/courses"
      : "/learn";
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <TopBar home="/learn" nav={nav} active={active} user={user} />
      <Content className="ng-content ng-content--narrow">{children}</Content>
    </Layout>
  );
}
