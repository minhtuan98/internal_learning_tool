"use client";

import { useState } from "react";
import { Alert, Button, Card, Divider, Flex, Input, Tag, Typography } from "antd";
import { BookOutlined, GoogleOutlined, LoginOutlined } from "@ant-design/icons";
import { devSignIn } from "@/server/auth-actions";

const { Title, Text } = Typography;

type U = { email: string; name: string; role: string; status: string; group: string | null };

const ERRORS: Record<string, string> = {
  state: "Phiên đăng nhập đã hết hạn. Vui lòng thử lại.",
  google: "Không đăng nhập được bằng Google. Vui lòng thử lại.",
  google_off: "Đăng nhập Google chưa được cấu hình trên máy chủ này.",
};

export default function LoginClient({ google, dev, error, users }: { google: boolean; dev: boolean; error?: string; users: U[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const go = async (e: string) => {
    setBusy(e);
    const r = await devSignIn(e);
    window.location.href = r.redirect;
  };
  return (
    <Flex justify="center" align="center" style={{ minHeight: "100vh", padding: 24 }}>
      <Flex vertical gap={16} style={{ width: 480 }}>
        <Card>
          <Flex vertical align="center" gap={8} style={{ textAlign: "center" }}>
            <span style={{ width: 48, height: 48, borderRadius: 12, background: "#214E91", color: "#fff", display: "grid", placeItems: "center", fontSize: 22 }}>
              <BookOutlined />
            </span>
            <Title level={3} style={{ margin: "8px 0 0" }}>Learning Hub</Title>
            <Text type="secondary">Nền tảng học tập nội bộ của Acme Company.</Text>
          </Flex>
          {error && <Alert type="error" showIcon title={ERRORS[error] ?? "Có lỗi khi đăng nhập."} style={{ marginTop: 20 }} />}
          <Button
            type="primary"
            size="large"
            block
            icon={<GoogleOutlined />}
            style={{ marginTop: 24 }}
            disabled={!google}
            href={google ? "/api/auth/google" : undefined}
          >
            Đăng nhập bằng Google
          </Button>
          <Text type="secondary" style={{ display: "block", marginTop: 10, fontSize: 12, textAlign: "center" }}>
            {google
              ? "Chỉ tài khoản đã được quản trị viên thêm mới đăng nhập được."
              : "Chưa cấu hình GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. Dùng đăng nhập nhanh bên dưới để thử."}
          </Text>
        </Card>

        {dev && (
          <Card title="Đăng nhập nhanh (chỉ dùng ở môi trường local)" size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>
              Vẫn áp dụng danh sách cho phép và trạng thái khóa như khi đăng nhập Google.
            </Text>
            <Flex vertical gap={6} style={{ marginTop: 12 }}>
              {users.map((u) => (
                <Button key={u.email} onClick={() => go(u.email)} loading={busy === u.email} style={{ height: "auto", padding: "8px 12px", textAlign: "left" }}>
                  <Flex justify="space-between" align="center" style={{ width: "100%" }}>
                    <span>
                      <Text strong>{u.name}</Text>
                      <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                        {u.email}
                        {u.group ? ` · ${u.group}` : ""}
                      </Text>
                    </span>
                    <Flex gap={4}>
                      {u.status === "LOCKED" && <Tag>Đã khóa</Tag>}
                      <Tag color={u.role === "ADMIN" ? "blue" : "default"}>{u.role === "ADMIN" ? "Admin" : "Member"}</Tag>
                    </Flex>
                  </Flex>
                </Button>
              ))}
            </Flex>
            <Divider plain style={{ fontSize: 12 }}>hoặc thử một email bất kỳ</Divider>
            <Flex gap={8}>
              <Input placeholder="email@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} onPressEnter={() => email && go(email)} />
              <Button icon={<LoginOutlined />} disabled={!email} onClick={() => go(email)} loading={busy === email}>
                Thử
              </Button>
            </Flex>
          </Card>
        )}
      </Flex>
    </Flex>
  );
}
