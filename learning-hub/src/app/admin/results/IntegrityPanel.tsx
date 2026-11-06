"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Col, Drawer, Empty, Flex, InputNumber, Row, Table, Tag, Timeline, Typography } from "antd";
import { FlagOutlined, SafetyOutlined, StopOutlined, WarningOutlined } from "@ant-design/icons";
import { FootNote, KpiCard, report } from "@/components/ui";
import { fmtDateTime, fmtDuration } from "@/lib/format";
import type { integrityRows } from "@/lib/integrity";
import { updateMaxViolations } from "@/server/integrity-actions";

type Data = Awaited<ReturnType<typeof integrityRows>> & { maxViolations: number };
type Row = Data["rows"][number];

/** Admin "Giám sát thi" (DESIGN_SYSTEM.md → Quiz integrity): threshold setting, flagged attempts, event log. */
export default function IntegrityPanel({ data, filters, loading }: { data: Data; filters: React.ReactNode; loading: boolean }) {
  const { message } = App.useApp();
  const router = useRouter();
  const [max, setMax] = useState<number | null>(data.maxViolations);
  const [saving, startSaving] = useTransition();
  const [open, setOpen] = useState<Row | null>(null);
  const save = () =>
    startSaving(async () => {
      if (report(message, await updateMaxViolations(Number(max)))) router.refresh();
    });
  const s = data.summary;
  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Flex justify="space-between" align="center" gap={24} wrap>
          <div style={{ maxWidth: 620 }}>
            <Typography.Text strong><SafetyOutlined /> Số lần vi phạm cho phép mỗi lượt thi</Typography.Text>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Áp dụng cho mọi khóa học. Vi phạm = rời màn hình làm bài (chuyển tab, ứng dụng khác), sao chép, chuột phải, in, phím chụp màn hình. Vượt quá số lần này, lượt thi bị hủy, tính 0 điểm và vẫn mất lượt.
            </Typography.Text>
          </div>
          <Flex gap={8} align="center">
            <InputNumber min={0} max={20} value={max} onChange={(v) => setMax(v)} suffix="lần" style={{ width: 110 }} aria-label="Số lần vi phạm cho phép" />
            <Button type="primary" loading={saving} disabled={max === data.maxViolations || max === null} onClick={save}>Lưu</Button>
          </Flex>
        </Flex>
      </Card>
      {filters}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><KpiCard label="Lượt thi trong phạm vi lọc" value={s.attempts} /></Col>
        <Col span={6}><KpiCard label="Lượt có vi phạm" value={s.withViolations} danger={s.withViolations > 0} /></Col>
        <Col span={6}><KpiCard label="Lượt bị hủy" value={s.voided} danger={s.voided > 0} /></Col>
        <Col span={6}><KpiCard label="Lượt bị gắn cờ" value={s.flagged} hint="Chỉ là dấu hiệu, cần xem lại" /></Col>
      </Row>
      <Table
        loading={loading}
        rowKey="id"
        dataSource={data.rows}
        pagination={{ pageSize: 15, hideOnSinglePage: true }}
        locale={{ emptyText: <Empty description="Chưa có vi phạm hay dấu hiệu bất thường." /> }}
        onRow={(r) => ({ onClick: () => setOpen(r), style: { cursor: "pointer" } })}
        columns={[
          { title: "Thành viên / Nhóm", render: (_, r) => (<><Typography.Text strong>{r.name}</Typography.Text><br /><Typography.Text type="secondary">{r.group ?? "—"}</Typography.Text></>) },
          { title: "Quiz · Lượt", render: (_, r) => (<><div>{r.quiz} · lượt {r.number}</div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.course}</Typography.Text></>) },
          { title: "Bắt đầu", render: (_, r) => fmtDateTime(r.startedAt) },
          { title: "Kết quả", render: (_, r) => (r.status === "IN_PROGRESS" ? <Tag color="processing">Đang làm</Tag> : r.voided ? <Tag color="error" icon={<StopOutlined />}>Bị hủy · 0%</Tag> : `${r.score}%`) },
          { title: "Vi phạm", sorter: (a, b) => a.violations - b.violations, render: (_, r) => (r.violations > 0 ? <Tag color="warning" icon={<WarningOutlined />}>{r.violations} / {data.maxViolations}</Tag> : <Typography.Text type="secondary">0</Typography.Text>) },
          { title: "Cờ bất thường", render: (_, r) => (r.flags.length ? <Flex gap={4} wrap>{r.flags.map((f) => <Tag key={f.flag} icon={<FlagOutlined />} color="purple">{f.label}</Tag>)}</Flex> : <Typography.Text type="secondary">—</Typography.Text>) },
        ]}
      />
      <FootNote>Cờ bất thường không chặn ai, chỉ giúp quản trị viên xem lại: mở nhiều tab/thiết bị, cùng mạng làm cùng lúc, nộp quá nhanh (dưới 5 giây/câu), đáp án giống hệt người khác.</FootNote>

      <Drawer open={!!open} onClose={() => setOpen(null)} size={480} title="Nhật ký lượt thi">
        {open && (
          <Flex vertical gap={16}>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>{open.name}</Typography.Title>
              <Typography.Text type="secondary">{open.email} · {open.group ?? "—"}</Typography.Text>
            </div>
            <div>
              <Typography.Text strong>{open.quiz} · lượt {open.number}</Typography.Text>
              <br />
              <Typography.Text type="secondary">
                Bắt đầu {fmtDateTime(open.startedAt)}
                {open.submittedAt ? ` · làm trong ${fmtDuration(new Date(open.submittedAt).getTime() - new Date(open.startedAt).getTime())}` : ""}
                {open.ip ? ` · mạng ${open.ip}` : ""}
              </Typography.Text>
            </div>
            {open.flags.length > 0 && (
              <Card size="small" title="Cờ bất thường">
                <Flex vertical gap={6}>
                  {open.flags.map((f) => (
                    <Typography.Text key={f.flag}>
                      <Tag color="purple" icon={<FlagOutlined />}>{f.label}</Tag>
                      {f.with.length > 0 && <Typography.Text type="secondary">cùng với {f.with.join(", ")}</Typography.Text>}
                    </Typography.Text>
                  ))}
                </Flex>
              </Card>
            )}
            <Typography.Text strong>Sự kiện ({open.events.length})</Typography.Text>
            {open.events.length === 0 ? (
              <Typography.Text type="secondary">Không có sự kiện.</Typography.Text>
            ) : (
              <Timeline
                items={open.events.map((e) => ({
                  color: e.type === "VOIDED" ? "red" : e.violation ? "orange" : "purple",
                  content: (
                    <>
                      <Typography.Text strong>{e.label}</Typography.Text>
                      {e.durationMs ? <Typography.Text type="secondary"> · rời {fmtDuration(e.durationMs)}</Typography.Text> : null}
                      <br />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {fmtDateTime(e.at)}
                        {e.violation ? " · tính vi phạm" : e.type === "VOIDED" ? "" : " · chỉ ghi nhận"}
                      </Typography.Text>
                    </>
                  ),
                }))}
              />
            )}
          </Flex>
        )}
      </Drawer>
    </>
  );
}
