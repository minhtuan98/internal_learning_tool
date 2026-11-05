"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Col, Flex, Modal, Progress, Radio, Row, Tag, Typography, theme } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, CloudSyncOutlined, ExclamationCircleOutlined, SendOutlined } from "@ant-design/icons";
import { saveAnswer, submitAttempt } from "@/server/member-actions";

const LETTERS = ["A", "B", "C", "D"];
type SaveState = "idle" | "saving" | "saved" | "error";

export default function TakeQuizClient({
  attempt,
  quiz,
  questions,
  answers: initial,
}: {
  attempt: { id: string; number: number; deadlineAt: string; serverNow: string };
  quiz: { id: string; title: string; maxAttempts: number; course: string };
  questions: { id: string; text: string; options: string[] }[];
  answers: Record<string, number>;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [answers, setAnswers] = useState<Record<string, number>>(initial);
  const [save, setSave] = useState<SaveState>("idle");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  // Countdown follows server time: offset between server and browser clocks.
  const offset = useRef(new Date(attempt.serverNow).getTime() - Date.now());
  const deadline = new Date(attempt.deadlineAt).getTime();
  const [left, setLeft] = useState(() => deadline - (Date.now() + offset.current));
  const submitted = useRef(false);

  const submit = useCallback(
    async (auto: boolean) => {
      if (submitted.current) return;
      submitted.current = true;
      setSubmitting(true);
      const r = await submitAttempt(attempt.id, auto);
      if (!r.ok) {
        submitted.current = false;
        setSubmitting(false);
        message.error(r.error);
        return;
      }
      router.replace(`/learn/attempts/${attempt.id}/result`);
    },
    [attempt.id, message, router],
  );

  useEffect(() => {
    const t = setInterval(() => {
      const l = deadline - (Date.now() + offset.current);
      setLeft(l);
      if (l <= 0) {
        clearInterval(t);
        setTimeUp(true);
        submit(true);
      }
    }, 500);
    return () => clearInterval(t);
  }, [deadline, submit]);

  const choose = async (qid: string, idx: number) => {
    setAnswers((a) => ({ ...a, [qid]: idx }));
    setSave("saving");
    const r = await saveAnswer(attempt.id, qid, idx);
    setSave(r.ok ? "saved" : "error");
    if (!r.ok) message.error(r.error);
  };

  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const secs = Math.max(0, Math.floor(left / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const urgent = secs <= 60;

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
        <div>
          <Typography.Text type="secondary">{quiz.course} · Lượt {attempt.number} / {quiz.maxAttempts}</Typography.Text>
          <Typography.Title level={3} style={{ margin: 0 }}>{quiz.title}</Typography.Title>
        </div>
        <Flex gap={12} align="center">
          <Tag icon={save === "saving" ? <CloudSyncOutlined spin /> : save === "error" ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />} color={save === "error" ? "error" : "default"}>
            {save === "saving" ? "Đang lưu…" : save === "error" ? "Chưa lưu được" : save === "saved" ? "Đã lưu tự động" : "Câu trả lời được lưu tự động"}
          </Tag>
          <Card size="small" styles={{ body: { padding: "6px 16px" } }} style={{ borderColor: urgent ? token.colorError : undefined }}>
            <Flex align="center" gap={8}>
              <ClockCircleOutlined style={{ color: urgent ? token.colorError : token.colorPrimary }} />
              <Typography.Text strong style={{ fontSize: 20, fontVariantNumeric: "tabular-nums", color: urgent ? token.colorError : undefined }} aria-live="polite">{mm}:{ss}</Typography.Text>
            </Flex>
          </Card>
        </Flex>
      </Flex>
      {timeUp && <Alert type="warning" showIcon title="Đã hết giờ. Bài làm đang được nộp tự động với các câu đã trả lời." style={{ marginBottom: 16 }} />}
      {urgent && !timeUp && <Alert type="error" showIcon title="Còn dưới 1 phút. Hết giờ bài sẽ tự nộp." style={{ marginBottom: 16 }} />}
      <Row gutter={24}>
        <Col span={17}>
          <Flex vertical gap={16}>
            {questions.map((q, i) => (
              <Card key={q.id} id={`q-${i}`}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>Câu {i + 1} / {questions.length}</Typography.Text>
                <Typography.Title level={5} style={{ margin: "4px 0 16px" }}>{q.text}</Typography.Title>
                <Radio.Group value={answers[q.id]} onChange={(e) => choose(q.id, e.target.value)} disabled={timeUp || submitting} style={{ width: "100%" }}>
                  <Flex vertical gap={8}>
                    {q.options.map((o, idx) => (
                      <label
                        key={idx}
                        style={{ display: "block", padding: "10px 14px", borderRadius: 8, border: `1px solid ${answers[q.id] === idx ? token.colorPrimary : token.colorBorder}`, background: answers[q.id] === idx ? token.colorPrimaryBg : undefined, cursor: "pointer" }}
                      >
                        <Radio value={idx}>
                          <Typography.Text strong style={{ marginRight: 8 }}>{LETTERS[idx]}.</Typography.Text>
                          {o}
                        </Radio>
                      </label>
                    ))}
                  </Flex>
                </Radio.Group>
              </Card>
            ))}
          </Flex>
        </Col>
        <Col span={7}>
          <Card title="Tiến độ" style={{ position: "sticky", top: 96 }}>
            <Progress percent={Math.round((answered / Math.max(1, questions.length)) * 100)} format={() => `${answered}/${questions.length}`} />
            <Flex gap={6} wrap style={{ margin: "12px 0 16px" }}>
              {questions.map((q, i) => (
                <Button key={q.id} size="small" type={answers[q.id] !== undefined ? "primary" : "default"} onClick={() => document.getElementById(`q-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} style={{ width: 36 }}>
                  {i + 1}
                </Button>
              ))}
            </Flex>
            <Button type="primary" block size="large" icon={<SendOutlined />} loading={submitting} disabled={timeUp} onClick={() => setConfirm(true)}>Nộp bài</Button>
          </Card>
        </Col>
      </Row>
      <Modal
        open={confirm}
        title="Nộp bài?"
        okText="Nộp bài"
        cancelText="Làm tiếp"
        onOk={() => { setConfirm(false); submit(false); }}
        onCancel={() => setConfirm(false)}
      >
        {answered < questions.length ? (
          <Alert type="warning" showIcon title={`Bạn còn ${questions.length - answered} câu chưa trả lời.`} description="Câu chưa trả lời được tính là sai. Sau khi nộp không sửa được." />
        ) : (
          <Typography.Text>Bạn đã trả lời tất cả {questions.length} câu. Sau khi nộp không sửa được.</Typography.Text>
        )}
      </Modal>
    </>
  );
}
