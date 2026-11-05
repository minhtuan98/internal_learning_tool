"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Col, Dropdown, Flex, Progress, Row, Segmented, Table, Tag, Typography } from "antd";
import { DeleteOutlined, MoreOutlined } from "@ant-design/icons";
import { AssignmentStateTag, DeadlineTag, FootNote, KpiCard, PageHeader, report } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { deleteAssignment } from "@/server/assignment-actions";
import AssignmentDrawer, { type AssignmentValue } from "../AssignmentDrawer";
import type { assignmentOptions } from "../data";

type Person = { userId: string; name: string; email: string; group: string | null; state: string; lessonsDone: number; lessonsTotal: number; quizzesPassed: number; quizzesTotal: number; bestScore: number | null; completedAt: Date | null };

export default function AssignmentDetailClient({ assignment, people, options }: { assignment: AssignmentValue & { course: string; targetLabels: string[] }; people: Person[]; options: Awaited<ReturnType<typeof assignmentOptions>> }) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const n = (s: string) => people.filter((p) => p.state === s).length;
  const shown = people.filter((p) => filter === "ALL" || p.state === filter);

  const remove = () =>
    modal.confirm({
      title: "Xóa giao bài?",
      content: "Kết quả học tập của thành viên vẫn được giữ.",
      okText: "Xóa giao bài",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        if (report(message, await deleteAssignment(assignment.id))) router.push("/admin/assignments");
      },
    });

  return (
    <>
      <PageHeader
        crumbs={[{ title: "Giao bài", href: "/admin/assignments" }, { title: assignment.course }]}
        title={assignment.course}
        meta={
          <Flex gap={8} align="center" wrap>
            <DeadlineTag deadline={assignment.deadline} done={people.length > 0 && n("COMPLETED") === people.length} />
            <Typography.Text type="secondary">Giao cho:</Typography.Text>
            {assignment.targetLabels.map((t) => <Tag key={t}>{t}</Tag>)}
          </Flex>
        }
        extra={
          <>
            <Button type="primary" onClick={() => setOpen(true)}>Sửa</Button>
            <Dropdown menu={{ items: [{ key: "del", danger: true, icon: <DeleteOutlined />, label: "Xóa giao bài", onClick: remove }] }}>
              <Button icon={<MoreOutlined />} aria-label="Thêm" />
            </Dropdown>
          </>
        }
      />
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}><KpiCard label="Được giao" value={people.length} /></Col>
        <Col span={6}><KpiCard label="Hoàn thành" value={n("COMPLETED")} /></Col>
        <Col span={6}><KpiCard label="Đang học" value={n("IN_PROGRESS")} hint={`${n("NOT_STARTED")} chưa bắt đầu`} /></Col>
        <Col span={6}><KpiCard label="Quá hạn" value={n("OVERDUE")} danger={n("OVERDUE") > 0} hint={n("NO_ACCESS") ? `${n("NO_ACCESS")} chưa có quyền truy cập` : undefined} /></Col>
      </Row>
      <Segmented
        style={{ marginBottom: 12 }}
        value={filter}
        onChange={(v) => setFilter(v as string)}
        options={[
          { value: "ALL", label: `Tất cả · ${people.length}` },
          { value: "NOT_STARTED", label: `Chưa bắt đầu · ${n("NOT_STARTED")}` },
          { value: "IN_PROGRESS", label: `Đang học · ${n("IN_PROGRESS")}` },
          { value: "COMPLETED", label: `Hoàn thành · ${n("COMPLETED")}` },
          { value: "OVERDUE", label: `Quá hạn · ${n("OVERDUE")}` },
          { value: "NO_ACCESS", label: `Chưa có quyền · ${n("NO_ACCESS")}` },
        ]}
      />
      <Table
        rowKey="userId"
        dataSource={shown}
        pagination={{ pageSize: 15, hideOnSinglePage: true }}
        locale={{ emptyText: "Không có ai ở trạng thái này." }}
        columns={[
          { title: "Thành viên / Nhóm", render: (_, p) => (<><Typography.Text strong>{p.name}</Typography.Text><br /><Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.group ?? "—"} · {p.email}</Typography.Text></>) },
          { title: "Bài đã học", width: 200, render: (_, p) => <Progress percent={p.lessonsTotal ? Math.round((p.lessonsDone / p.lessonsTotal) * 100) : 0} size="small" format={() => `${p.lessonsDone}/${p.lessonsTotal}`} /> },
          { title: "Quiz đã đạt", render: (_, p) => `${p.quizzesPassed} / ${p.quizzesTotal}` },
          { title: "Điểm cao nhất", render: (_, p) => (p.bestScore === null ? "—" : `${p.bestScore}%`) },
          { title: "Trạng thái", render: (_, p) => <AssignmentStateTag state={p.state} /> },
          { title: "Hoàn thành lúc", render: (_, p) => fmtDateTime(p.completedAt) },
        ]}
      />
      <FootNote>Giả định: “Hoàn thành” = học hết bài và đạt mọi quiz đã xuất bản của khóa. Thông báo / nhắc nhở nằm ngoài phạm vi MVP.</FootNote>
      <AssignmentDrawer open={open} value={assignment} {...options} onClose={() => setOpen(false)} />
    </>
  );
}
