"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Col, Flex, Modal, Progress, Radio, Row, Tag, Typography, theme } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, CloudSyncOutlined, ExclamationCircleOutlined, SafetyOutlined, SendOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { attemptHeartbeat, reportViolation, saveAnswer, submitAttempt } from "@/server/member-actions";
import type { ViolationType } from "@/lib/integrity";
import { BLUR_MIN_MS, COUNTING_RULES, TAB_MIN_MS, VIOLATION_RULES } from "@/lib/integrity-rules";

const VIOLATION_TEXT: Record<string, string> = {
  TAB_HIDDEN: "Bạn vừa rời màn hình làm bài (chuyển tab hoặc thu nhỏ trình duyệt).",
  WINDOW_BLUR: "Bạn vừa chuyển sang ứng dụng hoặc cửa sổ khác.",
  COPY: "Không được sao chép nội dung bài thi.",
  CONTEXT_MENU: "Không được dùng chuột phải trong bài thi.",
  PRINT: "Không được in bài thi.",
  PRINT_SCREEN: "Không được chụp màn hình bài thi.",
  DEVTOOLS: "Không được mở công cụ nhà phát triển trong bài thi.",
  LEFT_PAGE: "Bạn vừa đóng, tải lại hoặc rời trang bài thi rồi quay lại.",
};
const RETRIES = [0, 1000, 3000]; // a violation is re-sent if the network drops; it is never lost silently

/** F12, Ctrl/Cmd+Shift+I/J/C, Cmd+Option+I/J/C, Ctrl/Cmd+U (view source). */
function isDevtoolsKey(e: KeyboardEvent) {
  const k = e.key.toLowerCase();
  if (e.key === "F12") return true;
  if ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey) && ["i", "j", "c"].includes(k)) return true;
  if ((e.ctrlKey || e.metaKey) && k === "u") return true;
  return false;
}

/** What counts as a violation (shown on the quiz screen and in every warning). */
function RulesList({ max }: { max: number }) {
  return (
    <div>
      <Typography.Text strong style={{ fontSize: 13 }}>Tính là vi phạm</Typography.Text>
      <ul style={{ margin: "6px 0 8px", paddingLeft: 18, fontSize: 13 }}>
        {VIOLATION_RULES.map((r) => <li key={r.type}>{r.label}</li>)}
      </ul>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{COUNTING_RULES(max)[0]} {COUNTING_RULES(max)[1]}</Typography.Text>
    </div>
  );
}

/** Repeating diagonal watermark (name · employee code · time) so a shared screenshot points back to its author. */
function Watermark({ text }: { text: string }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220"><text x="20" y="130" transform="rotate(-22 210 110)" font-family="Inter, Arial, sans-serif" font-size="15" fill="rgb(128,128,128)" fill-opacity="0.16">${text.replace(/[<>&"]/g, "")}</text></svg>`;
  return <div aria-hidden className="lh-watermark" style={{ backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")` }} />;
}

const LETTERS = ["A", "B", "C", "D"];
type SaveState = "idle" | "saving" | "saved" | "error";

export default function TakeQuizClient({
  attempt,
  quiz,
  questions,
  answers: initial,
  integrity,
  pendingWarning,
}: {
  attempt: { id: string; number: number; deadlineAt: string; serverNow: string; violations: number };
  integrity: { maxViolations: number; viewer: string };
  /** Set by the server when the member came back after leaving the page (LEFT_PAGE). */
  pendingWarning?: { type: string; count: number; max: number } | null;
  quiz: { id: string; title: string; maxAttempts: number; course: string };
  questions: { id: string; text: string; options: string[] }[];
  answers: Record<string, number>;
}) {
  const router = useRouter();
  const { message, modal } = App.useApp();
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

  // ---------- Anti-cheat (DESIGN_SYSTEM.md → Quiz integrity) ----------
  const [violations, setViolations] = useState(attempt.violations);
  const [warn, setWarn] = useState<{ type: string; count: number; max: number } | null>(pendingWarning ?? null);
  const lastReport = useRef<Partial<Record<ViolationType, number>>>({});
  // One violation at a time: from the moment one is detected until the member presses "Tôi đã hiểu",
  // nothing else is counted (also covers the wait for the server's answer).
  const paused = useRef(Boolean(pendingWarning));
  const unsent = useRef<{ type: ViolationType; durationMs?: number; signalOnly: boolean }[]>([]);
  const send = useCallback(
    async (type: ViolationType, durationMs: number | undefined, signalOnly: boolean) => {
      for (const wait of RETRIES) {
        if (wait) await new Promise((r) => setTimeout(r, wait));
        try {
          const r = await reportViolation(attempt.id, type, durationMs, signalOnly);
          if (r.ok) return r.data ?? null;
          return null; // refused by the server (attempt over, not yours): nothing to retry
        } catch {
          /* network / server down: retry */
        }
      }
      unsent.current.push({ type, durationMs, signalOnly }); // re-sent with the next heartbeat
      return null;
    },
    [attempt.id],
  );
  const resultUrl = `/learn/attempts/${attempt.id}/result`;
  const report = useCallback(
    async (type: ViolationType, durationMs?: number) => {
      if (submitted.current) return;
      if (paused.current) {
        // A warning is open: not counted (Product Owner rule), but logged so admins still see it
        if (type === "TAB_HIDDEN" || type === "WINDOW_BLUR") void send(type, durationMs, true);
        return;
      }
      const now = Date.now();
      if (now - (lastReport.current[type] ?? 0) < 2000) return; // one key held down = one violation
      lastReport.current[type] = now;
      paused.current = true;
      let data: Awaited<ReturnType<typeof send>> = null;
      try {
        data = await send(type, durationMs, false);
      } finally {
        if (!data) paused.current = false; // never leave detection switched off
      }
      if (!data) {
        message.warning("Mất kết nối: vi phạm sẽ được ghi nhận khi có mạng trở lại.");
        return;
      }
      setViolations(data.count);
      if (data.voided) {
        submitted.current = true;
        setWarn(null);
        modal.error({
          title: "Lượt thi đã bị hủy",
          content: `Bạn đã vi phạm ${data.count} lần, vượt quá ${data.max} lần cho phép. Lượt này tính 0 điểm và vẫn tính là một lượt đã dùng.`,
          okText: "Xem kết quả",
          onOk: () => router.replace(resultUrl),
        });
      } else setWarn({ type, count: data.count, max: data.max });
    },
    [send, message, modal, router, resultUrl],
  );
  const acknowledge = () => {
    setWarn(null);
    paused.current = false;
  };

  // Leaving the quiz, measured on return: tab hidden from 0.2 s, another app / window from 1 s
  useEffect(() => {
    let leftAt: number | null = null;
    let kind: ViolationType = "WINDOW_BLUR";
    const leave = (k: ViolationType) => {
      if (leftAt === null) {
        leftAt = Date.now();
        kind = k;
      } else if (k === "TAB_HIDDEN") kind = k;
    };
    const back = () => {
      if (leftAt === null) return;
      const away = Date.now() - leftAt;
      leftAt = null;
      if (away >= (kind === "TAB_HIDDEN" ? TAB_MIN_MS : BLUR_MIN_MS)) report(kind, away);
    };
    const onVisibility = () => (document.hidden ? leave("TAB_HIDDEN") : back());
    const onBlur = () => leave(document.hidden ? "TAB_HIDDEN" : "WINDOW_BLUR");
    const onFocus = () => !document.hidden && back();
    // Copy / right-click / print / Print Screen: blocked where the browser allows it, always logged
    const block = (type: ViolationType) => (e: Event) => {
      e.preventDefault();
      report(type);
    };
    const onCopy = block("COPY");
    const onMenu = block("CONTEXT_MENU");
    const onKey = (e: KeyboardEvent) => {
      if (isDevtoolsKey(e)) {
        e.preventDefault();
        report("DEVTOOLS");
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        report("PRINT");
      }
      if (e.key === "PrintScreen") report("PRINT_SCREEN");
    };
    const onPrint = () => report("PRINT");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("contextmenu", onMenu);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("beforeprint", onPrint);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("contextmenu", onMenu);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("beforeprint", onPrint);
    };
  }, [report]);

  // Heartbeat with a per-tab token: a second tab/device on the same attempt is flagged for admins
  useEffect(() => {
    const key = `lh-attempt-tab-${attempt.id}`;
    let tabToken = "";
    try {
      tabToken = sessionStorage.getItem(key) ?? "";
      if (!tabToken) sessionStorage.setItem(key, (tabToken = crypto.randomUUID()));
    } catch {
      tabToken = crypto.randomUUID();
    }
    const ping = async () => {
      try {
        const r = await attemptHeartbeat(attempt.id, tabToken);
        if (r.ok && r.data?.status === "SUBMITTED" && !submitted.current) router.replace(resultUrl); // ended elsewhere
        // violations that could not be sent earlier (network down) are counted now
        for (const v of unsent.current.splice(0)) {
          if (v.signalOnly) void send(v.type, v.durationMs, true);
          else void report(v.type, v.durationMs);
        }
      } catch {
        /* offline: next ping */
      }
    };
    ping();
    const t = setInterval(ping, 10_000);
    // Closing, reloading or leaving the page: tell the server; coming back ≥ 3 s later counts (LEFT_PAGE)
    const beacon = () => {
      if (!submitted.current) navigator.sendBeacon(`/api/attempts/${attempt.id}/leave`);
    };
    window.addEventListener("pagehide", beacon);
    return () => {
      clearInterval(t);
      window.removeEventListener("pagehide", beacon);
      beacon(); // left the quiz inside the app (menu link, back button)
    };
  }, [attempt.id, router, resultUrl, send, report]);

  const [stamp, setStamp] = useState(() => dayjs().format("HH:mm DD/MM/YYYY"));
  useEffect(() => {
    const t = setInterval(() => setStamp(dayjs().format("HH:mm DD/MM/YYYY")), 60_000);
    return () => clearInterval(t);
  }, []);

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
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div>
          <Typography.Text type="secondary">{quiz.course} · Lượt {attempt.number} / {quiz.maxAttempts}</Typography.Text>
          <Typography.Title level={3} style={{ margin: 0 }}>{quiz.title}</Typography.Title>
        </div>
        <Flex gap={12} align="center">
          <Tag icon={<SafetyOutlined />} color={violations > 0 ? "warning" : "default"}>
            Vi phạm {violations} / {integrity.maxViolations}
          </Tag>
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
      <Watermark text={`${integrity.viewer} · ${stamp}`} />
      <Row gutter={24} className="lh-noselect">
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
            <Button type="primary" block icon={<SendOutlined />} loading={submitting} disabled={timeUp} onClick={() => setConfirm(true)}>Nộp bài</Button>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
              <RulesList max={integrity.maxViolations} />
            </div>
          </Card>
        </Col>
      </Row>
      <Modal
        open={!!warn}
        title={warn ? `Cảnh báo vi phạm ${warn.count} / ${warn.max}` : ""}
        okText="Tôi đã hiểu, làm tiếp"
        cancelButtonProps={{ style: { display: "none" } }}
        onOk={acknowledge}
        closable={false}
        mask={{ closable: false }}
        keyboard={false}
      >
        {warn && (
          <Flex vertical gap={12}>
          <Alert
            type={warn.count >= warn.max ? "error" : "warning"}
            showIcon
            title={VIOLATION_TEXT[warn.type]}
            description={
              warn.count >= warn.max
                ? "Đây là lần cuối được phép. Vi phạm thêm một lần nữa, lượt thi sẽ bị hủy và tính 0 điểm."
                : `Vượt quá ${warn.max} lần, lượt thi sẽ bị hủy và tính 0 điểm. Quản trị viên xem được nhật ký vi phạm.`
            }
          />
          <RulesList max={warn.max} />
          </Flex>
        )}
      </Modal>
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
