import { Button, Flex, Result } from "antd";
import { fmtDateTime } from "@/lib/format";

/** F8-2 / F11: 403 screens for members. */
export default function NoAccess({ assigned }: { assigned?: { course: string; deadline: Date } | null }) {
  return (
    <Flex justify="center" style={{ paddingTop: 48 }}>
      {assigned ? (
        <Result
          status="403"
          title="Bạn chưa có quyền truy cập khóa học được giao"
          subTitle={`Khóa học “${assigned.course}” đã được giao cho bạn, hạn chót ${fmtDateTime(assigned.deadline)}, nhưng quản trị viên chưa mở quyền truy cập. Vui lòng liên hệ quản trị viên.`}
          extra={<Button type="primary" href="/learn">Về Việc của tôi</Button>}
        />
      ) : (
        <Result
          status="403"
          title="Bạn không còn quyền truy cập khóa học này"
          subTitle="Quản trị viên đã gỡ quyền hoặc khóa học đã chuyển về Bản nháp."
          extra={<Button type="primary" href="/learn/courses">Về Khóa học của tôi</Button>}
        />
      )}
    </Flex>
  );
}
