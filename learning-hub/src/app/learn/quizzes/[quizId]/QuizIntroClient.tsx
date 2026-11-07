"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Col, Descriptions, Flex, Row, Table, Tag, Typography } from "antd";
import { PlayCircleOutlined, SafetyOutlined } from "@ant-design/icons";
import { FootNote, PageHeader, PassTag } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { startAttempt } from "@/server/member-actions";
import { COUNTING_RULES, VIOLATION_RULES } from "@/lib/integrity-rules";

type Q = { id: string; title: string; questions: number; passScore: number; timeLimitMinutes: number; maxAttempts: number; opensAt: Date | null; closesAt: Date | null };
type A = { id: string; number: number; status: string; score: number | null; passed: boolean | null; submittedAt: Date | null; auto: boolean; voided: boolean };

export default function QuizIntroClient({ course, quiz, check, deadline, locked, attempts, maxViolations }: { course: { id: string; title: string }; quiz: Q; check: { ok: true; resume: boolean } | { ok: false; reason: string }; deadline: Date | null; locked: boolean; attempts: A[]; maxViolations: number }) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [busy, setBusy] = useState(false);
  const used = attempts.length;

  const start = () => {
    const go = async () => {
      setBusy(true);
      const r = await startAttempt(quiz.id);
      if (!r.ok) {
        setBusy(false);
        message.error(r.error);
        router.refresh();
        return;
      }
      router.push(`/learn/attempts/${r.data!.attemptId}`);
    };
    if (check.ok && check.resume) return void go();
    modal.confirm({
      title: `Bắt đầu lượt ${used + 1} / ${quiz.maxAttempts}?`,
      content: `Bạn có ${quiz.timeLimitMinutes} phút cho ${quiz.questions} câu hỏi. Đồng hồ tính theo máy chủ và không dừng khi bạn rời trang. Hết giờ, bài sẽ tự nộp. Rời màn hình làm bài quá ${maxViolations} lần thì lượt thi bị hủy (0 điểm).`,
      okText: "Bắt đầu làm bài",
      cancelText: "Để sau",
      onOk: go,
    });
  };

  return (
    <>
      <PageHeader crumbs={[{ title: "Khóa học của tôi", href: "/learn/courses" }, { title: course.title, href: `/learn/courses/${course.id}` }, { title: quiz.title }]} title={quiz.title} description={course.title} />
      <Row gutter={24}>
        <Col span={15}>
          <Card>
            <Descriptions
              column={2}
              items={[
                { key: "q", label: "Số câu hỏi", children: `${quiz.questions} câu` },
                { key: "p", label: "Điểm đạt", children: `≥ ${quiz.passScore}% (cần đạt để hoàn thành khóa và nhận chứng chỉ)` },
                { key: "t", label: "Thời gian", children: `${quiz.timeLimitMinutes} phút` },
                { key: "a", label: "Số lượt", children: `Đã dùng ${used} / ${quiz.maxAttempts}` },
                { key: "w", label: "Thời gian mở", children: quiz.opensAt || quiz.closesAt ? `${fmtDateTime(quiz.opensAt)} – ${fmtDateTime(quiz.closesAt)}` : "Không giới hạn" },
                ...(deadline ? [{ key: "d", label: "Hạn chót khóa học", children: <Tag color={locked ? "error" : "warning"}>{fmtDateTime(deadline)}</Tag> }] : []),
              ]}
            />
            <Alert
              style={{ marginTop: 12 }}
              type="info"
              showIcon
              icon={<SafetyOutlined />}
              title="Quy định làm bài"
              description={
                <>
                  <div style={{ marginTop: 4 }}>Trong lúc làm bài, các hành động sau <b>tính là vi phạm</b>:</div>
                  <ul style={{ margin: "4px 0 8px", paddingLeft: 18 }}>
                    {VIOLATION_RULES.map((r) => <li key={r.type}>{r.label}</li>)}
                  </ul>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {COUNTING_RULES(maxViolations).map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </>
              }
            />
            {check.ok ? (
              <Flex justify="flex-end" style={{ marginTop: 12 }}>
                <Button type="primary" icon={<PlayCircleOutlined />} loading={busy} onClick={start}>{check.resume ? "Tiếp tục lượt đang làm" : used > 0 ? "Làm lại" : "Bắt đầu làm bài"}</Button>
              </Flex>
            ) : (
              <Alert style={{ marginTop: 12 }} type={locked ? "error" : "warning"} showIcon title={check.reason} description={locked ? `Đã quá hạn ${fmtDateTime(deadline)}. Bạn vẫn xem được kết quả các lượt đã làm.` : undefined} />
            )}
          </Card>
        </Col>
        <Col span={9}>
          <Card title="Lịch sử lượt làm">
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={attempts}
              locale={{ emptyText: "Bạn chưa làm quiz này." }}
              onRow={(a) => ({ onClick: () => a.status === "SUBMITTED" && router.push(`/learn/attempts/${a.id}/result`), style: { cursor: a.status === "SUBMITTED" ? "pointer" : undefined } })}
              columns={[
                { title: "Lượt", dataIndex: "number" },
                { title: "Điểm", render: (_, a) => (a.status === "IN_PROGRESS" ? <Tag color="processing">Đang làm</Tag> : a.voided ? <Tag color="error">Bị hủy · 0%</Tag> : `${a.score}%`) },
                { title: "Kết quả", render: (_, a) => <PassTag passed={a.passed} /> },
              ]}
            />
            {attempts.some((a) => a.auto) && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Một số lượt được tự nộp khi hết giờ.</Typography.Text>}
          </Card>
        </Col>
      </Row>
      <FootNote>Kết quả được tính bằng điểm cao nhất trong các lượt. Chỉ câu hỏi đã được quản trị viên duyệt mới xuất hiện trong bài.</FootNote>
    </>
  );
}
