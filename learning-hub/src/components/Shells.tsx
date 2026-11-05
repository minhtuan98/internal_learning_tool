"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar, Button, Dropdown, Flex, Layout, Menu, Tag, Tooltip, Typography, theme } from "antd";
import {
  AppstoreOutlined,
  BarChartOutlined,
  BookOutlined,
  CalendarOutlined,
  FolderOutlined,
  LogoutOutlined,
  MoonOutlined,
  SafetyCertificateOutlined,
  SunOutlined,
  TeamOutlined,
  UserOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import { useThemeMode } from "./Providers";
import { SIDER_WIDTH } from "@/theme/tokens";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

export type ShellUser = { name: string; email: string; avatarUrl: string | null; role: "ADMIN" | "MEMBER"; initials: string };

function Logo({ href }: { href: string }) {
  const { token } = theme.useToken();
  return (
    <Link href={href}>
      <Flex align="center" gap={10}>
        <span style={{ width: 32, height: 32, borderRadius: 8, background: token.colorPrimary, color: "#fff", display: "grid", placeItems: "center" }}>
          <BookOutlined />
        </span>
        <Text strong style={{ fontSize: 18 }}>Learning Hub</Text>
      </Flex>
    </Link>
  );
}

function ThemeToggle() {
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
                  <Tag color={user.role === "ADMIN" ? "blue" : "default"}>{user.role === "ADMIN" ? "Quản trị viên" : "Thành viên"}</Tag>
                </div>
              </div>
            ),
          },
          { type: "divider" },
          { key: "logout", icon: <LogoutOutlined />, label: "Đăng xuất", onClick: logout },
        ],
      }}
    >
      <Button type="text" style={{ height: 40 }}>
        <Flex align="center" gap={8}>
          <Avatar size={30} src={user.avatarUrl ?? undefined}>{user.initials}</Avatar>
          <Text>{user.name}</Text>
        </Flex>
      </Button>
    </Dropdown>
  );
}

const ADMIN_NAV = [
  { key: "/admin/dashboard", icon: <AppstoreOutlined />, label: "Tổng quan" },
  { key: "/admin/courses", icon: <BookOutlined />, label: "Khóa học" },
  { key: "/admin/assignments", icon: <CalendarOutlined />, label: "Giao bài" },
  { key: "/admin/users", icon: <UserOutlined />, label: "Người dùng" },
  { key: "/admin/groups", icon: <TeamOutlined />, label: "Nhóm" },
  { key: "/admin/categories", icon: <FolderOutlined />, label: "Danh mục" },
  { key: "/admin/results", icon: <BarChartOutlined />, label: "Kết quả" },
];

export function AdminShell({ user, memberCount, children }: { user: ShellUser; memberCount: number; children: ReactNode }) {
  const pathname = usePathname();
  const { token } = theme.useToken();
  const active = ADMIN_NAV.find((n) => pathname.startsWith(n.key))?.key ?? "/admin/dashboard";
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={SIDER_WIDTH} style={{ borderRight: `1px solid ${token.colorBorderSecondary}`, position: "sticky", top: 0, height: "100vh" }}>
        <Flex vertical style={{ height: "100%", padding: "20px 16px" }} gap={24}>
          <Logo href="/admin/dashboard" />
          <div style={{ padding: "0 8px" }}>
            <Text type="secondary" style={{ fontSize: 11, letterSpacing: 0.5 }}>WORKSPACE</Text>
            <Text strong style={{ display: "block" }}>Acme Company</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{memberCount} người · Nội bộ</Text>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[active]}
            style={{ borderInlineEnd: "none" }}
            items={ADMIN_NAV.map((n) => ({ key: n.key, icon: n.icon, label: <Link href={n.key}>{n.label}</Link> }))}
          />
          <div style={{ marginTop: "auto", padding: 14, borderRadius: 8, background: token.colorFillQuaternary }}>
            <SafetyCertificateOutlined />
            <Text strong style={{ display: "block", marginTop: 6, fontSize: 13 }}>Không gian quản trị</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Nội dung, quyền truy cập và kết quả học tập.</Text>
          </div>
        </Flex>
      </Sider>
      <Layout>
        <Header style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, position: "sticky", top: 0, zIndex: 10 }}>
          <Flex justify="flex-end" align="center" gap={12} style={{ height: "100%" }}>
            <ThemeToggle />
            <UserMenu user={user} />
          </Flex>
        </Header>
        <Content style={{ padding: "32px 40px 48px" }}>{children}</Content>
      </Layout>
    </Layout>
  );
}

export function MemberShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const pathname = usePathname();
  const { token } = theme.useToken();
  const nav = [
    { key: "/learn", label: "Việc của tôi", icon: <CheckSquareOutlined /> },
    { key: "/learn/courses", label: "Khóa học của tôi", icon: <BookOutlined /> },
  ];
  const active = pathname.startsWith("/learn/courses") || pathname.startsWith("/learn/quizzes") || pathname.startsWith("/learn/attempts") ? "/learn/courses" : "/learn";
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, position: "sticky", top: 0, zIndex: 10 }}>
        <Flex align="center" gap={32} style={{ height: "100%", maxWidth: 1200, margin: "0 auto" }}>
          <Logo href="/learn" />
          <Menu
            mode="horizontal"
            selectedKeys={[active]}
            style={{ flex: 1, borderBottom: "none", background: "transparent" }}
            items={nav.map((n) => ({ key: n.key, icon: n.icon, label: <Link href={n.key}>{n.label}</Link> }))}
          />
          <Flex gap={12} align="center">
            <ThemeToggle />
            <UserMenu user={user} />
          </Flex>
        </Flex>
      </Header>
      <Content style={{ padding: "32px 24px 48px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
      </Content>
    </Layout>
  );
}
