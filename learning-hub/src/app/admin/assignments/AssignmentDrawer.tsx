"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs, { type Dayjs } from "dayjs";
import { App, Button, DatePicker, Drawer, Flex, Form, Modal, Select, Typography } from "antd";
import { TeamOutlined, UserOutlined, WarningOutlined } from "@ant-design/icons";
import { report } from "@/components/ui";
import { checkAssignmentAccess, saveAssignment } from "@/server/assignment-actions";

export type AssignmentValue = { id: string; courseId: string; userIds: string[]; groupIds: string[]; deadline: Date };
type Missing = { id: string; name: string; email: string; group: string | null };

export default function AssignmentDrawer({
  open,
  value,
  courses,
  members,
  groups,
  onClose,
}: {
  open: boolean;
  value: AssignmentValue | null;
  courses: { id: string; title: string; lessons: number; quizzes: number }[];
  members: { id: string; name: string; email: string; group: string | null }[];
  groups: { id: string; name: string; count: number }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<{ total: number; list: Missing[] } | null>(null);
  const courseId = Form.useWatch("courseId", form) as string | undefined;
  const course = courses.find((c) => c.id === courseId);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (value)
      form.setFieldsValue({
        courseId: value.courseId,
        targets: [...value.groupIds.map((g) => `g:${g}`), ...value.userIds.map((u) => `u:${u}`)],
        deadline: dayjs(value.deadline),
      });
  }, [open, value, form]);

  const payload = async () => {
    const v = await form.validateFields();
    const targets = (v.targets as string[]) ?? [];
    return {
      courseId: v.courseId as string,
      groupIds: targets.filter((t) => t.startsWith("g:")).map((t) => t.slice(2)),
      userIds: targets.filter((t) => t.startsWith("u:")).map((t) => t.slice(2)),
      deadline: (v.deadline as Dayjs).toISOString(),
    };
  };

  const commit = async () => {
    const p = await payload();
    setBusy(true);
    const r = await saveAssignment(value?.id ?? null, p);
    setBusy(false);
    if (report(message, r)) {
      setMissing(null);
      onClose();
      if (!value && r.ok && r.data) router.push(`/admin/assignments/${r.data.id}`);
      else router.refresh();
    }
  };

  /** Step 1: check access first; show the notification (DEC-056) if someone cannot open the course. */
  const submit = async () => {
    const p = await payload();
    setBusy(true);
    const r = await checkAssignmentAccess(p);
    setBusy(false);
    if (!r.ok) return void message.error(r.error);
    if (r.data && r.data.missing.length > 0) setMissing({ total: r.data.total, list: r.data.missing });
    else await commit();
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        size={560}
        title={value ? "Sửa giao bài" : "Giao bài mới"}
        destroyOnHidden
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={onClose}>Hủy</Button>
            <Button type="primary" loading={busy} onClick={submit}>{value ? "Lưu thay đổi" : "Giao bài"}</Button>
          </Flex>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="courseId" label="Khóa học" rules={[{ required: true, message: "Chọn khóa học." }]} extra={course ? `${course.lessons} bài học · ${course.quizzes} quiz. Giao bài luôn là giao cả khóa học.` : "Chỉ hiện khóa học đã xuất bản."}>
            <Select showSearch optionFilterProp="label" placeholder="Chọn khóa học" options={courses.map((c) => ({ value: c.id, label: c.title }))} />
          </Form.Item>
          <Form.Item name="targets" label="Giao cho" rules={[{ required: true, message: "Chọn ít nhất 1 người hoặc 1 nhóm." }]} extra="Chọn cả nhóm hoặc từng người. Thành viên mới vào nhóm cũng nhận được bài giao.">
            <Select
              mode="multiple"
              placeholder="Tìm nhóm hoặc người"
              optionFilterProp="label"
              options={[
                { label: "Nhóm", options: groups.map((g) => ({ value: `g:${g.id}`, label: `${g.name} (${g.count} người)`, icon: <TeamOutlined /> })) },
                { label: "Từng người", options: members.map((m) => ({ value: `u:${m.id}`, label: `${m.name} · ${m.email}${m.group ? ` · ${m.group}` : ""}`, icon: <UserOutlined /> })) },
              ]}
            />
          </Form.Item>
          <Form.Item name="deadline" label="Hạn chót" rules={[{ required: true, message: "Chọn hạn chót." }]} extra="Sau hạn chót, thành viên không học tiếp và không làm quiz của khóa được nữa.">
            <DatePicker showTime={{ format: "HH:mm" }} format="DD/MM/YYYY HH:mm" style={{ width: "100%" }} disabledDate={(d) => d.isBefore(dayjs().startOf("day"))} />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        open={missing !== null}
        onCancel={() => setMissing(null)}
        title={
          <Flex gap={8} align="center">
            <WarningOutlined style={{ color: "#83550B" }} />
            {missing?.list.length} người chưa có quyền truy cập khóa học này
          </Flex>
        }
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setMissing(null)}>Quay lại chỉnh sửa</Button>
            <Button onClick={() => window.open(`/admin/courses/${courseId}?tab=access`, "_blank")}>Đến Quyền truy cập</Button>
            <Button type="primary" loading={busy} onClick={commit}>Vẫn giao bài</Button>
          </Flex>
        }
      >
        <Typography.Paragraph type="secondary">
          Bài giao đến {missing?.total} người. Những người dưới đây sẽ thấy khóa học trong “Việc của tôi” nhưng chưa mở được cho đến khi được cấp quyền.
        </Typography.Paragraph>
        <Flex vertical gap={8}>
          {missing?.list.map((m) => (
            <Flex key={m.id} justify="space-between" style={{ padding: "8px 12px", borderRadius: 8, background: "var(--lh-bg)" }}>
              <Typography.Text strong>{m.name}</Typography.Text>
              <Typography.Text type="secondary">{m.group ?? "—"} · {m.email}</Typography.Text>
            </Flex>
          ))}
        </Flex>
        <Typography.Text type="secondary" style={{ display: "block", marginTop: 12, fontSize: 12 }}>
          Giả định: các nút trong thông báo này đang chờ Product Owner xác nhận (DEC-056).
        </Typography.Text>
      </Modal>
    </>
  );
}
