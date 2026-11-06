"use client";

import Link from "next/link";
import { Button, Card, Col, Empty, Flex, Progress, Row, Tag, Tooltip, Typography } from "antd";
import { CheckCircleOutlined, LockOutlined } from "@ant-design/icons";
import { AssignmentStateTag, DeadlineTag, FootNote, KpiCard, PageHeader } from "@/components/ui";
import { fmtDate, fmtDateTime } from "@/lib/format";

type Item = {
  id: string;
  courseId: string;
  title: string;
  category: string;
  coverImage: string;
  deadline: Date;
  state: string;
  hasAccess: boolean;
  lessonsDone: number;
  lessonsTotal: number;
  completedAt: Date | null;
  quizzes: { id: string; title: string; bestScore: number | null; passed: boolean; left: number; opensAt: Date | null }[];
};

const WEEK = 7 * 86_400_000;

export default function MyWorkClient({ items }: { items: Item[] }) {
  const now = Date.now();
  const sections = [
    { key: "overdue", title: "Quá hạn", items: items.filter((i) => i.state === "OVERDUE") },
    { key: "soon", title: "Sắp đến hạn (7 ngày tới)", items: items.filter((i) => i.state !== "OVERDUE" && i.state !== "COMPLETED" && new Date(i.deadline).getTime() - now <= WEEK) },
    { key: "open", title: "Còn hạn", items: items.filter((i) => i.state !== "OVERDUE" && i.state !== "COMPLETED" && new Date(i.deadline).getTime() - now > WEEK) },
    { key: "done", title: "Đã hoàn thành", items: items.filter((i) => i.state === "COMPLETED") },
  ];
  const todo = sections[1].items.length + sections[2].items.length;

  return (
    <>
      <PageHeader title="Việc của tôi" description="Khóa học bạn được giao, sắp xếp theo hạn chót." />
      <Row gutter={16} className="lh-stagger" style={{ marginBottom: 16 }}>
        <Col span={8}><KpiCard label="Cần làm" value={todo} /></Col>
        <Col span={8}><KpiCard label="Quá hạn" value={sections[0].items.length} danger={sections[0].items.length > 0} /></Col>
        <Col span={8}><KpiCard label="Đã hoàn thành" value={sections[3].items.length} /></Col>
      </Row>
      {items.length === 0 ? (
        <Card>
          <Empty description="Bạn chưa được giao khóa học nào.">
            <Link href="/learn/courses">Xem khóa học của tôi</Link>
          </Empty>
        </Card>
      ) : (
        sections
          .filter((s) => s.items.length > 0)
          .map((s) => (
            <div key={s.key} style={{ marginBottom: 16 }}>
              <Typography.Title level={5} style={{ marginBottom: 12 }}>{s.title} · {s.items.length}</Typography.Title>
              <Flex vertical gap={12} className="lh-stagger">
                {s.items.map((i) => <WorkCard key={i.id} item={i} />)}
              </Flex>
            </div>
          ))
      )}
      <FootNote>Sau hạn chót, khóa học chưa hoàn thành sẽ bị khóa: bạn không học tiếp và không làm quiz được nữa, nhưng vẫn xem được kết quả đã có.</FootNote>
    </>
  );
}

function WorkCard({ item: i }: { item: Item }) {
  const pctDone = i.lessonsTotal ? Math.round((i.lessonsDone / i.lessonsTotal) * 100) : 0;
  const href = `/learn/courses/${i.courseId}`;
  let action;
  if (!i.hasAccess)
    action = (
      <Tooltip title="Quản trị viên chưa mở quyền truy cập khóa học này cho bạn.">
        <Button disabled icon={<LockOutlined />}>Chưa mở được</Button>
      </Tooltip>
    );
  else if (i.state === "OVERDUE") action = <Button href={href}>Xem kết quả</Button>;
  else if (i.state === "COMPLETED") action = <Button href={href}>Xem khóa học</Button>;
  else action = <Button type="primary" href={href}>{i.lessonsDone > 0 || i.quizzes.some((q) => q.bestScore !== null) ? "Tiếp tục học" : "Bắt đầu"}</Button>;

  return (
    <Card styles={{ body: { padding: 16 } }}>
      <Flex gap={16} align="center">
        <img src={`/api/files/${i.coverImage}`} alt="" style={{ width: 140, height: 92, objectFit: "cover", borderRadius: 8, flexShrink: 0, filter: i.hasAccess ? undefined : "grayscale(1)" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Flex gap={8} align="center" wrap>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{i.category}</Typography.Text>
            {i.hasAccess ? <AssignmentStateTag state={i.state} /> : <AssignmentStateTag state="NO_ACCESS" />}
          </Flex>
          <Typography.Title level={5} style={{ margin: "4px 0 8px" }}>{i.title}</Typography.Title>
          <Flex gap={16} align="center">
            <Progress percent={pctDone} size="small" style={{ width: 220, margin: 0 }} format={() => `${i.lessonsDone}/${i.lessonsTotal} bài`} />
            <Flex gap={6} wrap>
              {i.quizzes.map((q) => (
                <Tag key={q.id} color={q.passed ? "success" : q.bestScore !== null ? "error" : "default"} icon={q.passed ? <CheckCircleOutlined /> : undefined}>
                  {q.title}: {q.bestScore !== null ? `${q.bestScore}% · ${q.passed ? "Đạt" : "Chưa đạt"}` : q.opensAt && new Date(q.opensAt) > new Date() ? `mở từ ${fmtDate(q.opensAt)}` : "Chưa làm"} · còn {q.left} lượt
                </Tag>
              ))}
            </Flex>
          </Flex>
          {i.state === "OVERDUE" && <Typography.Text type="danger" style={{ display: "block", marginTop: 8, fontSize: 13 }}>Đã hết hạn lúc {fmtDateTime(i.deadline)}, không thể học tiếp.</Typography.Text>}
          {i.state === "COMPLETED" && i.completedAt && <Typography.Text type="success" style={{ display: "block", marginTop: 8, fontSize: 13 }}>Hoàn thành ngày {fmtDate(i.completedAt)}</Typography.Text>}
        </div>
        <Flex vertical align="flex-end" gap={12} style={{ flexShrink: 0 }}>
          <DeadlineTag deadline={i.deadline} done={i.state === "COMPLETED"} />
          {action}
        </Flex>
      </Flex>
    </Card>
  );
}
