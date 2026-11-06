"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Drawer, Flex, Progress, Select, Table, Tabs, Tag, Typography, theme } from "antd";
import { ClearOutlined } from "@ant-design/icons";
import { FootNote, PageHeader, PassTag } from "@/components/ui";
import { fmtDateTime, fmtDuration } from "@/lib/format";
import type { learningProgress, quizResults } from "@/lib/stats";
import IntegrityPanel from "./IntegrityPanel";

type QuizRow = Awaited<ReturnType<typeof quizResults>>[number];
type ProgRow = Awaited<ReturnType<typeof learningProgress>>[number];

export default function ResultsClient({
  tab,
  filter,
  courses,
  quizzes,
  groups,
  quizRows,
  progressRows,
  integrity,
}: {
  tab: "quiz" | "progress" | "integrity";
  filter: { course: string | null; quiz: string | null; group: string | null };
  courses: { id: string; title: string }[];
  quizzes: { id: string; title: string }[];
  groups: { id: string; name: string }[];
  quizRows: QuizRow[];
  progressRows: ProgRow[];
  integrity: React.ComponentProps<typeof IntegrityPanel>["data"] | null;
}) {
  const router = useRouter();
  const { token } = theme.useToken();
  const [detail, setDetail] = useState<QuizRow | null>(null);
  const [pending, startTransition] = useTransition(); // filter/tab change re-renders on the server → Table loading
  const go = (next: Partial<typeof filter> & { tab?: string }) => {
    const v = { ...filter, tab, ...next };
    const sp = new URLSearchParams();
    if (v.tab && v.tab !== "quiz") sp.set("tab", v.tab);
    if (v.course) sp.set("course", v.course);
    if (v.quiz && v.tab !== "progress") sp.set("quiz", v.quiz);
    if (v.group) sp.set("group", v.group);
    startTransition(() => router.push(`/admin/results${sp.size ? `?${sp}` : ""}`));
  };
  const filtered = filter.course || filter.quiz || filter.group;

  const filters = (
    <Flex gap={12} style={{ marginBottom: 16 }}>
      <Select allowClear placeholder="Tất cả khóa học" style={{ width: 240 }} value={filter.course} onChange={(v) => go({ course: v ?? null, quiz: null })} options={courses.map((c) => ({ value: c.id, label: c.title }))} />
      {tab !== "progress" && <Select allowClear placeholder="Tất cả quiz" style={{ width: 240 }} value={filter.quiz} onChange={(v) => go({ quiz: v ?? null })} options={quizzes.map((q) => ({ value: q.id, label: q.title }))} />}
      <Select allowClear placeholder="Tất cả nhóm" style={{ width: 180 }} value={filter.group} onChange={(v) => go({ group: v ?? null })} options={groups.map((g) => ({ value: g.id, label: g.name }))} />
      {filtered && <Button icon={<ClearOutlined />} onClick={() => go({ course: null, quiz: null, group: null })}>Xóa bộ lọc</Button>}
    </Flex>
  );

  return (
    <>
      <PageHeader crumbs={[{ title: "Không gian học tập" }, { title: "Kết quả" }]} title="Kết quả học tập" description="Theo dõi kết quả theo thành viên, quiz và nhóm." />
      <Tabs
        activeKey={tab}
        onChange={(k) => go({ tab: k })}
        items={[
          {
            key: "quiz",
            label: "Kết quả quiz",
            children: (
              <>
                {filters}
                <Table
                  loading={pending}
                  rowKey="key"
                  dataSource={quizRows}
                  pagination={{ pageSize: 15, hideOnSinglePage: true }}
                  locale={{ emptyText: "Chưa có lượt nộp bài nào." }}
                  onRow={(r) => ({ onClick: () => setDetail(r), style: { cursor: "pointer" } })}
                  columns={[
                    { title: "Thành viên / Nhóm", render: (_, r) => (<><Typography.Text strong>{r.name}</Typography.Text><br /><Typography.Text type="secondary">{r.group ?? "—"}</Typography.Text></>) },
                    { title: "Quiz", render: (_, r) => (<><div>{r.quiz}</div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.course}</Typography.Text></>) },
                    { title: "Lượt", render: (_, r) => `${r.used} / ${r.max}` },
                    { title: "Điểm cao nhất", render: (_, r) => `${r.best}%` },
                    { title: "Kết quả", render: (_, r) => <PassTag passed={r.passed} /> },
                    { title: "Lần nộp gần nhất", render: (_, r) => fmtDateTime(r.last) },
                  ]}
                />
                <FootNote>Cột điểm hiển thị điểm cao nhất. Bấm vào một dòng để xem lịch sử lượt làm (không hiển thị đáp án).</FootNote>
              </>
            ),
          },
          {
            key: "integrity",
            label: "Giám sát thi",
            children: integrity ? <IntegrityPanel data={integrity} filters={filters} loading={pending} /> : null,
          },
          {
            key: "progress",
            label: "Tiến độ học bài",
            children: (
              <>
                {filters}
                <Table
                  loading={pending}
                  rowKey="key"
                  dataSource={progressRows}
                  pagination={{ pageSize: 15, hideOnSinglePage: true }}
                  locale={{ emptyText: "Chưa có dữ liệu tiến độ." }}
                  columns={[
                    { title: "Thành viên / Nhóm", render: (_, r) => (<><Typography.Text strong>{r.name}</Typography.Text>{r.status === "LOCKED" && <Tag style={{ marginLeft: 6 }}>Đã khóa</Tag>}<br /><Typography.Text type="secondary">{r.group ?? "—"}</Typography.Text></>) },
                    { title: "Khóa học", dataIndex: "course" },
                    { title: "Bài đã học", render: (_, r) => `${r.lessonsDone} / ${r.lessonsTotal}` },
                    { title: "Tiến độ", width: 220, render: (_, r) => <Progress percent={r.rate} size="small" /> },
                    { title: "Lần học gần nhất", render: (_, r) => fmtDateTime(r.lastActivity) },
                    { title: "Trạng thái", render: (_, r) => (r.lessonsDone === 0 ? <Tag>Chưa bắt đầu</Tag> : r.lessonsDone >= r.lessonsTotal ? <Tag color="success">Đã học hết bài</Tag> : <Tag color="processing">Đang học</Tag>) },
                  ]}
                />
              </>
            ),
          },
        ]}
      />
      <Drawer open={detail !== null} onClose={() => setDetail(null)} size={460} title="Chi tiết lượt làm">
        {detail && (
          <Flex vertical gap={16}>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>{detail.name}</Typography.Title>
              <Typography.Text type="secondary">{detail.email} · {detail.group ?? "—"}</Typography.Text>
            </div>
            <div>
              <Typography.Text strong>{detail.quiz}</Typography.Text>
              <br />
              <Typography.Text type="secondary">{detail.course}</Typography.Text>
            </div>
            <Card style={{ background: detail.passed ? token.colorSuccessBg : token.colorErrorBg }}>
              <Flex justify="space-between" align="center">
                <Typography.Title level={2} style={{ margin: 0 }}>{detail.best}%</Typography.Title>
                <div style={{ textAlign: "right" }}>
                  <PassTag passed={detail.passed} />
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>Điểm cao nhất · {detail.used} / {detail.max} lượt</Typography.Text>
                </div>
              </Flex>
            </Card>
            <Typography.Text strong>Lịch sử lượt làm</Typography.Text>
            {detail.attempts
              .sort((a, b) => b.number - a.number)
              .map((a) => (
                <Flex key={a.number} justify="space-between" align="center" style={{ paddingBottom: 12, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                  <div>
                    <Typography.Text strong>Lượt {a.number} · {fmtDateTime(a.submittedAt)}</Typography.Text>
                    <br />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {a.submittedAt ? fmtDuration(new Date(a.submittedAt).getTime() - new Date(a.startedAt).getTime()) : "—"}
                      {a.auto ? " · tự nộp khi hết giờ" : ""}
                    </Typography.Text>
                  </div>
                  <Flex vertical align="flex-end" gap={4}>
                    {a.voided ? <Tag color="error">Bị hủy · 0%</Tag> : <Typography.Text strong>{a.score}%</Typography.Text>}
                    <PassTag passed={a.passed} />
                  </Flex>
                </Flex>
              ))}
          </Flex>
        )}
      </Drawer>
    </>
  );
}
