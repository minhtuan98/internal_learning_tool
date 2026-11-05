"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Dropdown, Flex, Input, Progress, Select, Table, Tabs, Tag, Typography } from "antd";
import { CalendarOutlined, DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { DeadlineTag, FootNote, PageHeader, report } from "@/components/ui";
import { deleteAssignment } from "@/server/assignment-actions";
import AssignmentDrawer, { type AssignmentValue } from "./AssignmentDrawer";
import type { assignmentOptions } from "./data";

type Row = AssignmentValue & { course: string; category: string; coverImage: string; targetLabels: string[]; total: number; completed: number; overdue: number; noAccess: number };
type Options = Awaited<ReturnType<typeof assignmentOptions>>;

export default function AssignmentsClient({ rows, options, initialTab, courseFilter }: { rows: Row[]; options: Options; initialTab: string; courseFilter: string | null }) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [tab, setTab] = useState(initialTab);
  const [q, setQ] = useState("");
  const [course, setCourse] = useState<string | null>(courseFilter);
  const [group, setGroup] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; value: AssignmentValue | null }>({ open: false, value: null });
  const now = Date.now();

  const data = useMemo(
    () =>
      rows.filter((r) => {
        const past = new Date(r.deadline).getTime() < now;
        if (tab === "open" && past) return false;
        if (tab === "overdue" && r.overdue === 0) return false;
        if (course && r.courseId !== course) return false;
        if (group && !r.groupIds.includes(group)) return false;
        return !q || r.course.toLowerCase().includes(q.toLowerCase());
      }),
    [rows, tab, course, group, q, now],
  );

  const remove = (r: Row) =>
    modal.confirm({
      title: "Xóa giao bài?",
      content: `Bài giao "${r.course}" sẽ biến mất khỏi “Việc của tôi” của ${r.total} người. Kết quả học tập vẫn được giữ.`,
      okText: "Xóa giao bài",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        if (report(message, await deleteAssignment(r.id))) router.refresh();
      },
    });

  return (
    <>
      <PageHeader
        crumbs={[{ title: "Không gian học tập" }, { title: "Giao bài" }]}
        title="Giao bài"
        description="Giao khóa học cho thành viên và nhóm, kèm hạn chót."
        extra={<Button type="primary" icon={<PlusOutlined />} disabled={options.courses.length === 0} onClick={() => setDrawer({ open: true, value: null })}>Giao bài</Button>}
      />
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: "all", label: `Tất cả · ${rows.length}` },
          { key: "open", label: `Còn hạn · ${rows.filter((r) => new Date(r.deadline).getTime() >= now).length}` },
          { key: "overdue", label: `Có người quá hạn · ${rows.filter((r) => r.overdue > 0).length}` },
        ]}
      />
      <Flex gap={12} style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="Tìm khóa học..." style={{ width: 280 }} onChange={(e) => setQ(e.target.value)} />
        <Select allowClear placeholder="Tất cả khóa học" style={{ width: 220 }} value={course} onChange={setCourse} options={options.courses.map((c) => ({ value: c.id, label: c.title }))} />
        <Select allowClear placeholder="Tất cả nhóm" style={{ width: 180 }} value={group} onChange={setGroup} options={options.groups.map((g) => ({ value: g.id, label: g.name }))} />
      </Flex>
      <Table
        rowKey="id"
        dataSource={data}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        locale={{ emptyText: rows.length ? "Không có giao bài phù hợp bộ lọc." : <Flex vertical align="center" gap={8} style={{ padding: 24 }}><CalendarOutlined style={{ fontSize: 28 }} /><span>Chưa có bài nào được giao.</span><Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawer({ open: true, value: null })}>Giao bài</Button></Flex> }}
        onRow={(r) => ({ onClick: () => router.push(`/admin/assignments/${r.id}`), style: { cursor: "pointer" } })}
        columns={[
          {
            title: "Khóa học",
            render: (_, r) => (
              <Flex gap={12} align="center">
                <img src={`/api/files/${r.coverImage}`} alt="" style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 6 }} />
                <div>
                  <Link href={`/admin/assignments/${r.id}`} onClick={(e) => e.stopPropagation()}><Typography.Text strong>{r.course}</Typography.Text></Link>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.category}</Typography.Text>
                </div>
              </Flex>
            ),
          },
          {
            title: "Giao cho",
            render: (_, r) => (
              <Flex gap={4} wrap>
                {r.targetLabels.slice(0, 2).map((t) => <Tag key={t}>{t}</Tag>)}
                {r.targetLabels.length > 2 && <Tag>+{r.targetLabels.length - 2}</Tag>}
              </Flex>
            ),
          },
          { title: "Hạn chót", render: (_, r) => <DeadlineTag deadline={r.deadline} done={r.total > 0 && r.completed === r.total} /> },
          { title: "Tiến độ", width: 200, render: (_, r) => (<><Progress percent={r.total ? Math.round((r.completed / r.total) * 100) : 0} size="small" showInfo={false} /><Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.completed} / {r.total} hoàn thành</Typography.Text></>) },
          { title: "Quá hạn", render: (_, r) => (r.overdue ? <Typography.Text type="danger" strong>{r.overdue} người</Typography.Text> : <Typography.Text type="secondary">0</Typography.Text>) },
          { title: "Chưa có quyền", render: (_, r) => (r.noAccess ? <Tag color="warning">{r.noAccess} người</Tag> : <Typography.Text type="secondary">0</Typography.Text>) },
          {
            title: "",
            width: 56,
            render: (_, r) => (
              <span onClick={(e) => e.stopPropagation()}>
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      { key: "view", icon: <EyeOutlined />, label: <Link href={`/admin/assignments/${r.id}`}>Xem</Link> },
                      { key: "edit", icon: <EditOutlined />, label: "Sửa", onClick: () => setDrawer({ open: true, value: r }) },
                      { key: "del", icon: <DeleteOutlined />, label: "Xóa giao bài", danger: true, onClick: () => remove(r) },
                    ],
                  }}
                >
                  <Button type="text" icon={<MoreOutlined />} aria-label="Thao tác" />
                </Dropdown>
              </span>
            ),
          },
        ]}
      />
      <FootNote>Giao bài luôn là giao cả khóa học. Sau hạn chót, thành viên chưa hoàn thành không học tiếp và không làm quiz của khóa được nữa.</FootNote>
      <AssignmentDrawer open={drawer.open} value={drawer.value} {...options} onClose={() => setDrawer({ open: false, value: null })} />
    </>
  );
}
