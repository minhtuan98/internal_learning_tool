"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Col, Empty, Flex, Progress, Row, Select, Spin, Table, Typography, theme } from "antd";
import { ArrowRightOutlined, BookOutlined as BookIcon, ClearOutlined, FilterOutlined } from "@ant-design/icons";
import { BarList, FootNote, KpiCard, PageHeader, StackedBar } from "@/components/ui";
import { daysOverdue, fmtDateTime } from "@/lib/format";
import type { dashboardStats } from "@/lib/stats";

type Stats = Awaited<ReturnType<typeof dashboardStats>>;
type Opt = { id: string; title?: string; name?: string };

export default function DashboardClient({ stats, courses, groups, filter }: { stats: Stats; courses: Opt[]; groups: Opt[]; filter: { course: string | null; group: string | null; days: number } }) {
  const router = useRouter();
  const { token } = theme.useToken();
  const [pending, startTransition] = useTransition(); // same-route navigation: loading.tsx does not show, so dim with Spin
  const go = (href: string) => startTransition(() => router.push(href));
  const setFilter = (k: string, v: string | number | null) => {
    const sp = new URLSearchParams();
    const next = { ...filter, [k]: v };
    if (next.course) sp.set("course", next.course);
    if (next.group) sp.set("group", next.group);
    if (next.days !== 30) sp.set("days", String(next.days));
    go(`/admin/dashboard${sp.size ? `?${sp}` : ""}`);
  };
  const filtered = filter.course || filter.group || filter.days !== 30;
  const noData = stats.completion.total === 0 && stats.passRate.total === 0 && stats.ai.reviewed === 0;

  return (
    <>
      <section className="lh-overview-hero">
        <div className="lh-overview-hero__copy">
          <span className="lh-eyebrow"><span className="lh-status-dot" /> HỌC TẬP & PHÁT TRIỂN</span>
          <PageHeader title="Tổng quan học tập" description="Một góc nhìn rõ ràng về hành trình phát triển của đội ngũ." />
          <Flex gap={10} wrap>
            <Button type="primary" href="/admin/courses" icon={<BookIcon />}>Quản lý khóa học</Button>
            <Button type="text" href="/admin/results" icon={<ArrowRightOutlined />} iconPlacement="end">Xem kết quả</Button>
          </Flex>
        </div>
        <div className="lh-hero-stat">
          <Progress strokeColor="var(--ws-accent)" type="circle" percent={stats.passRate.rate} size={112} strokeWidth={6} format={(v) => <span>{v}<small>%</small></span>} />
          <div><Typography.Text strong>Tỷ lệ đạt quiz</Typography.Text><Typography.Text type="secondary">{stats.passRate.passed} / {stats.passRate.total} lượt nộp bài</Typography.Text></div>
        </div>
      </section>
      <Flex className="lh-filterbar" gap={12} style={{ marginBottom: 24 }} wrap>
        <span className="lh-filter-label"><FilterOutlined /> Bộ lọc</span>
        <Select aria-label="Lọc theo khóa học" allowClear placeholder="Tất cả khóa học" style={{ width: 240 }} value={filter.course} onChange={(v) => setFilter("course", v ?? null)} options={courses.map((c) => ({ value: c.id, label: c.title }))} />
        <Select aria-label="Lọc theo nhóm" allowClear placeholder="Tất cả nhóm" style={{ width: 180 }} value={filter.group} onChange={(v) => setFilter("group", v ?? null)} options={groups.map((g) => ({ value: g.id, label: g.name }))} />
        <Select aria-label="Khoảng thời gian" style={{ width: 160 }} value={filter.days} onChange={(v) => setFilter("days", v)} options={[7, 30, 90, 365].map((d) => ({ value: d, label: `${d} ngày qua` }))} />
        {filtered && <Button icon={<ClearOutlined />} onClick={() => go("/admin/dashboard")}>Xóa bộ lọc</Button>}
      </Flex>

      <Spin spinning={pending} delay={150} description="Đang cập nhật số liệu…">
      {noData ? (
        <Card><Empty description={filtered ? "Không có dữ liệu cho bộ lọc này." : "Chưa có hoạt động học trong khoảng thời gian này."} /></Card>
      ) : (
        <>
          <Row gutter={[16, 16]} className="lh-stagger">
            <Col xs={24} sm={12} xl={6}>
              <KpiCard label="Tỷ lệ hoàn thành bài học" value={stats.completion.rate} suffix="%" hint={`${stats.completion.done} / ${stats.completion.total} bài`} definition="Số bài đã học xong / tổng số bài trong các khóa đã xuất bản mà thành viên được mở quyền." href="/admin/results?tab=progress" />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <KpiCard label="Tỷ lệ đạt quiz" value={stats.passRate.rate} suffix="%" hint={`${stats.passRate.passed} / ${stats.passRate.total} lượt`} definition="Số lượt nộp bài đạt / tổng số lượt nộp bài trong khoảng thời gian đã chọn." href="/admin/results" />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <KpiCard label="Thành viên có khóa học quá hạn" value={stats.overdueMembers} danger={stats.overdueMembers > 0} hint="Chưa hoàn thành khi đã qua hạn chót" definition="Thành viên được giao khóa học, đã qua hạn chót nhưng chưa học hết bài và đạt mọi quiz." href="/admin/assignments?tab=overdue" />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <KpiCard label="Câu hỏi AI duyệt không cần sửa" value={stats.ai.cleanRate} suffix="%" hint={`${stats.ai.approvedClean} / ${stats.ai.reviewed} câu đã duyệt`} definition="Câu hỏi AI được duyệt mà không chỉnh sửa / tổng số câu đã duyệt hoặc đã loại." />
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="Tỷ lệ hoàn thành theo nhóm" style={{ height: "100%" }}>
                <BarList rows={stats.byGroup} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Chất lượng câu hỏi AI" style={{ height: "100%" }}>
                <StackedBar
                  parts={[
                    { label: "Duyệt không sửa", value: stats.ai.approvedClean, color: token.colorSuccess },
                    { label: "Đã sửa", value: stats.ai.approvedEdited, color: token.colorWarning },
                    { label: "Từ chối", value: stats.ai.rejected, color: token.colorError },
                  ]}
                />
                {stats.ai.pending > 0 && <Typography.Text type="secondary" style={{ display: "block", marginTop: 12 }}>{stats.ai.pending} câu đang chờ duyệt (chưa tính).</Typography.Text>}
              </Card>
            </Col>
          </Row>

          <Card title="Thành viên có khóa học quá hạn" style={{ marginTop: 16 }} extra={<Link href="/admin/assignments?tab=overdue">Xem tất cả</Link>}>
            <Table
              size="middle"
              rowKey="key"
              pagination={false}
              dataSource={stats.overdue.slice(0, 8)}
              locale={{ emptyText: "Không có ai quá hạn." }}
              columns={[
                { title: "Thành viên / Nhóm", render: (_, r) => (<><Typography.Text strong>{r.name}</Typography.Text><br /><Typography.Text type="secondary">{r.group ?? "—"}</Typography.Text></>) },
                { title: "Khóa học", render: (_, r) => <Link href={`/admin/assignments/${r.assignmentId}`}>{r.course}</Link> },
                { title: "Hạn chót", render: (_, r) => fmtDateTime(r.deadline) },
                { title: "Quá hạn", render: (_, r) => <Typography.Text type="danger">{daysOverdue(r.deadline)} ngày</Typography.Text> },
                { title: "Tiến độ", width: 200, render: (_, r) => <Progress percent={r.lessonsTotal ? Math.round((r.lessonsDone / r.lessonsTotal) * 100) : 0} size="small" format={() => `${r.lessonsDone}/${r.lessonsTotal}`} /> },
              ]}
            />
          </Card>

          <Card title="Tỷ lệ đạt theo quiz" style={{ marginTop: 16 }}>
            <Table
              size="middle"
              rowKey="id"
              pagination={false}
              dataSource={stats.byQuiz}
              locale={{ emptyText: "Chưa có lượt làm bài trong khoảng thời gian này." }}
              columns={[
                { title: "Quiz", dataIndex: "title" },
                { title: "Khóa học", dataIndex: "course" },
                { title: "Lượt làm", render: (_, r) => `${r.attempts} lượt · ${r.people} người` },
                { title: "Tỷ lệ đạt", width: 220, render: (_, r) => <Progress percent={r.rate} size="small" /> },
              ]}
            />
          </Card>
        </>
      )}
      </Spin>
      <FootNote>Hoàn thành một khóa được giao = học hết bài và đạt mọi quiz đã xuất bản của khóa (giả định, chờ Product Owner xác nhận).</FootNote>
    </>
  );
}
