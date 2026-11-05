import { Alert, Button, Card, Flex } from "antd";
import { Text, Title } from "@/components/ui";
import { LockOutlined, StopOutlined } from "@/components/icons";



/** S02 / S03: account not on the allowlist, or locked (DEC-012, DEC-028). */
export default async function DeniedPage({ searchParams }: { searchParams: Promise<{ reason?: string; email?: string }> }) {
  const { reason, email } = await searchParams;
  const locked = reason === "LOCKED";
  return (
    <Flex justify="center" align="center" style={{ minHeight: "100vh", padding: 24 }}>
      <Card style={{ width: 520 }}>
        <Flex vertical gap={12}>
          {locked ? <LockOutlined style={{ fontSize: 28, color: "#83550B" }} /> : <StopOutlined style={{ fontSize: 28, color: "#B42318" }} />}
          <Title level={3} style={{ margin: 0 }}>{locked ? "Tài khoản của bạn đã bị khóa" : "Bạn chưa có quyền đăng nhập"}</Title>
          {email && <Text>Email đang dùng: {email}</Text>}
          {locked ? (
            <Alert type="warning" showIcon title="Kết quả học tập vẫn được giữ" description="Liên hệ quản trị viên để kiểm tra và mở lại tài khoản." />
          ) : (
            <Text type="secondary">Tài khoản này chưa được quản trị viên thêm vào hệ thống. Liên hệ quản trị viên để được hỗ trợ.</Text>
          )}
          <div>
            <Button type="primary" href="/login">{locked ? "Về trang đăng nhập" : "Đăng nhập bằng tài khoản khác"}</Button>
          </div>
        </Flex>
      </Card>
    </Flex>
  );
}
