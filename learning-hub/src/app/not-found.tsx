import { Button, Flex, Result } from "antd";

export default function NotFound() {
  return (
    <Flex justify="center" align="center" style={{ minHeight: "70vh" }}>
      <Result status="404" title="Không tìm thấy trang" subTitle="Trang bạn tìm không tồn tại hoặc đã bị xóa." extra={<Button type="primary" href="/">Về trang chủ</Button>} />
    </Flex>
  );
}
