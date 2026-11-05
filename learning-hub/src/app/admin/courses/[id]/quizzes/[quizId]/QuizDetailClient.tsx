"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs, { type Dayjs } from "dayjs";
import { Alert, App, Button, Card, Checkbox, Col, DatePicker, Descriptions, Dropdown, Empty, Flex, Form, Input, InputNumber, Modal, Radio, Row, Segmented, Spin, Statistic, Table, Tabs, Tag, Typography } from "antd";
import { CheckCircleFilled, CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined, MoreOutlined, RobotOutlined, UndoOutlined } from "@ant-design/icons";
import { CourseStatusTag, FootNote, PageHeader, PassTag, report } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { approveAllPending, deleteQuiz, generateQuizQuestions, reviewQuestion, saveQuizSettings, setQuizStatus, updateQuestion, updateQuizInfo } from "@/server/quiz-actions";

type Q = { id: string; text: string; options: string[]; correctIndex: number; explanation: string | null; reviewStatus: string; edited: boolean; sample: boolean };
type Quiz = { id: string; title: string; status: string; passScore: number; timeLimitMinutes: number; maxAttempts: number; opensAt: Date | null; closesAt: Date | null; sourceIds: string[] };
type Attempt = { id: string; name: string; group: string | null; number: number; status: string; score: number | null; passed: boolean | null; startedAt: Date; submittedAt: Date | null; auto: boolean };

const LETTERS = ["A", "B", "C", "D"];

export default function QuizDetailClient({
  tab,
  aiMode,
  quiz,
  course,
  questions,
  attempts,
  stats,
}: {
  tab: string;
  aiMode: "claude" | "sample";
  quiz: Quiz;
  course: { id: string; title: string; lessons: { id: string; title: string; type: string; hasTranscript: boolean }[] };
  questions: Q[];
  attempts: Attempt[];
  stats: { people: number; passRate: number | null; avg: number | null };
}) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [filter, setFilter] = useState<string>("ALL");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Q | null>(null);
  const [qForm] = Form.useForm();
  const [sForm] = Form.useForm();
  const [iForm] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const refresh = () => router.refresh();

  const counts = useMemo(() => ({
    ALL: questions.length,
    PENDING: questions.filter((q) => q.reviewStatus === "PENDING").length,
    APPROVED: questions.filter((q) => q.reviewStatus === "APPROVED").length,
    REJECTED: questions.filter((q) => q.reviewStatus === "REJECTED").length,
  }), [questions]);
  const shown = questions.filter((q) => filter === "ALL" || q.reviewStatus === filter);

  const generate = async () => {
    setGenerating(true);
    setGenError(null);
    const r = await generateQuizQuestions(quiz.id, count);
    setGenerating(false);
    if (r.ok) {
      message.success(r.message ?? "Đã tạo câu hỏi.");
      setFilter("PENDING");
      refresh();
    } else setGenError(r.error);
  };

  const review = async (q: Q, status: "APPROVED" | "REJECTED" | "PENDING") => {
    if (report(message, await reviewQuestion(q.id, status))) refresh();
  };

  const openEdit = (q: Q) => {
    setEditing(q);
    qForm.setFieldsValue({ text: q.text, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation ?? "" });
  };
  const saveEdit = async (approve: boolean) => {
    const v = await qForm.validateFields();
    setBusy(true);
    const r = await updateQuestion(editing!.id, v, approve);
    setBusy(false);
    if (report(message, r)) {
      setEditing(null);
      refresh();
    }
  };

  const saveSettings = async () => {
    const v = await sForm.validateFields();
    const win = v.window as [Dayjs | null, Dayjs | null] | null;
    setBusy(true);
    const r = await saveQuizSettings(quiz.id, {
      passScore: v.passScore,
      timeLimitMinutes: v.timeLimitMinutes,
      maxAttempts: v.maxAttempts,
      opensAt: win?.[0]?.toISOString() ?? null,
      closesAt: win?.[1]?.toISOString() ?? null,
    });
    setBusy(false);
    if (report(message, r)) refresh();
  };

  const saveInfo = async () => {
    const v = await iForm.validateFields();
    setBusy(true);
    const r = await updateQuizInfo(quiz.id, { title: v.title, lessonIds: v.lessonIds ?? [] });
    setBusy(false);
    if (report(message, r)) refresh();
  };

  const toggleStatus = () => {
    const publishing = quiz.status === "DRAFT";
    modal.confirm({
      title: publishing ? "Xuất bản quiz?" : "Chuyển quiz về nháp?",
      content: publishing ? `Thành viên có quyền truy cập khóa học sẽ làm được quiz với ${counts.APPROVED} câu hỏi đã duyệt.` : "Thành viên sẽ không thấy quiz này nữa. Kết quả cũ được giữ.",
      okText: publishing ? "Xuất bản" : "Chuyển về nháp",
      cancelText: "Hủy",
      onOk: async () => {
        if (report(message, await setQuizStatus(quiz.id, publishing ? "PUBLISHED" : "DRAFT"))) refresh();
      },
    });
  };

  const remove = () =>
    modal.confirm({
      title: "Xóa quiz này?",
      content: "Toàn bộ câu hỏi sẽ bị xóa. Không thể hoàn tác.",
      okText: "Xóa quiz",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        if (report(message, await deleteQuiz(quiz.id))) router.push(`/admin/courses/${course.id}?tab=quizzes`);
      },
    });

  const statusTag = (q: Q) =>
    q.reviewStatus === "APPROVED" ? (
      <Tag color="success">{q.edited ? "AI · Đã sửa" : "AI · Duyệt không sửa"}</Tag>
    ) : q.reviewStatus === "REJECTED" ? (
      <Tag color="error">Đã loại</Tag>
    ) : (
      <Tag color="warning">Chờ duyệt</Tag>
    );

  const questionsTab = (
    <Row gutter={24}>
      <Col span={17}>
        <Card style={{ marginBottom: 16 }}>
          <Flex justify="space-between" align="center" gap={16}>
            <div>
              <Typography.Text strong><RobotOutlined /> Tạo câu hỏi bằng AI</Typography.Text>
              <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                Từ {quiz.sourceIds.length} bài học nguồn. Câu hỏi mới ở trạng thái Chờ duyệt.
                {aiMode === "sample" && " Chưa cấu hình ANTHROPIC_API_KEY: sẽ tạo câu hỏi MẪU để thử luồng duyệt."}
              </Typography.Text>
            </div>
            <Flex gap={8} align="center">
              <InputNumber min={1} max={20} value={count} onChange={(v) => setCount(v ?? 10)} suffix="câu" style={{ width: 110 }} />
              <Button type="primary" icon={<RobotOutlined />} loading={generating} onClick={generate}>Tạo câu hỏi</Button>
            </Flex>
          </Flex>
          {generating && (
            <Spin>
              <Alert style={{ marginTop: 12 }} type="info" title="AI đang đọc bài học và soạn câu hỏi…" description="Việc này có thể mất khoảng 1 phút. Bạn có thể ở lại trang này." />
            </Spin>
          )}
          {genError && (
            <Alert
              style={{ marginTop: 12 }}
              type="error"
              showIcon
              title="Không tạo được câu hỏi"
              description={genError}
              action={<Flex vertical gap={6}><Button size="small" onClick={generate}>Thử lại</Button><Button size="small" onClick={() => router.replace(`/admin/courses/${course.id}/quizzes/${quiz.id}?tab=info`)}>Đổi bài học nguồn</Button></Flex>}
            />
          )}
        </Card>
        <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v as string)}
            options={[
              { value: "ALL", label: `Tất cả · ${counts.ALL}` },
              { value: "PENDING", label: `Chờ duyệt · ${counts.PENDING}` },
              { value: "APPROVED", label: `Đã duyệt · ${counts.APPROVED}` },
              { value: "REJECTED", label: `Đã loại · ${counts.REJECTED}` },
            ]}
          />
          {counts.PENDING > 0 && (
            <Button
              icon={<CheckOutlined />}
              onClick={() =>
                modal.confirm({
                  title: `Duyệt cả ${counts.PENDING} câu đang chờ?`,
                  content: "Bạn nên đọc từng câu trước khi duyệt. Câu được duyệt sẽ hiển thị cho thành viên khi quiz xuất bản.",
                  okText: "Duyệt tất cả",
                  cancelText: "Hủy",
                  onOk: async () => {
                    if (report(message, await approveAllPending(quiz.id))) refresh();
                  },
                })
              }
            >
              Duyệt tất cả câu chờ
            </Button>
          )}
        </Flex>
        {shown.length === 0 ? (
          <Card><Empty description={questions.length ? "Không có câu hỏi ở trạng thái này." : "Chưa có câu hỏi. Bấm “Tạo câu hỏi” để AI soạn từ bài học nguồn."} /></Card>
        ) : (
          <Flex vertical gap={12}>
            {shown.map((q) => (
              <Card key={q.id} size="small" style={{ opacity: q.reviewStatus === "REJECTED" ? 0.65 : 1 }}>
                <Flex justify="space-between" align="flex-start" gap={12}>
                  <Typography.Text strong style={{ fontSize: 15 }}>Câu {questions.indexOf(q) + 1}. {q.text}</Typography.Text>
                  <Flex gap={4}>{q.sample && <Tag>Mẫu</Tag>}{statusTag(q)}</Flex>
                </Flex>
                <Flex vertical gap={6} style={{ margin: "12px 0" }}>
                  {q.options.map((o, i) => (
                    <Flex key={i} gap={8} align="flex-start" style={{ padding: "6px 10px", borderRadius: 6, background: i === q.correctIndex ? "var(--lh-correct, rgba(32,99,71,.08))" : undefined }}>
                      <Typography.Text strong style={{ width: 18 }}>{LETTERS[i]}</Typography.Text>
                      <Typography.Text style={{ flex: 1 }}>{o}</Typography.Text>
                      {i === q.correctIndex && <CheckCircleFilled style={{ color: "#206347" }} />}
                    </Flex>
                  ))}
                </Flex>
                {q.explanation && <Typography.Text type="secondary" style={{ fontSize: 13 }}>Giải thích: {q.explanation}</Typography.Text>}
                <Flex gap={8} justify="flex-end" style={{ marginTop: 10 }}>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(q)}>Sửa</Button>
                  {q.reviewStatus !== "REJECTED" && <Button size="small" danger icon={<CloseOutlined />} onClick={() => review(q, "REJECTED")}>Loại</Button>}
                  {q.reviewStatus === "REJECTED" && <Button size="small" icon={<UndoOutlined />} onClick={() => review(q, "PENDING")}>Khôi phục</Button>}
                  {q.reviewStatus !== "APPROVED" && <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => review(q, "APPROVED")}>Duyệt</Button>}
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </Col>
      <Col span={7}>
        <Card title="Thống kê nhanh">
          <Flex vertical gap={16}>
            <Statistic title="Người đã làm" value={stats.people} />
            <Statistic title="Tỷ lệ đạt" value={stats.passRate ?? "—"} suffix={stats.passRate !== null ? "%" : undefined} />
            <Statistic title="Điểm trung bình" value={stats.avg ?? "—"} suffix={stats.avg !== null ? "%" : undefined} />
          </Flex>
        </Card>
        <Alert style={{ marginTop: 16 }} type="info" showIcon title="Quiz đã xuất bản vẫn sửa được toàn bộ." description="Thay đổi câu hỏi và cài đặt áp dụng ngay cho thành viên (DEC-057)." />
      </Col>
    </Row>
  );

  const settingsTab = (
    <Card style={{ maxWidth: 720 }}>
      <Form
        form={sForm}
        layout="vertical"
        initialValues={{ passScore: quiz.passScore, timeLimitMinutes: quiz.timeLimitMinutes, maxAttempts: quiz.maxAttempts, window: [quiz.opensAt ? dayjs(quiz.opensAt) : null, quiz.closesAt ? dayjs(quiz.closesAt) : null] }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="passScore" label="Điểm đạt" rules={[{ required: true }]} extra="Phần trăm số câu đúng.">
              <InputNumber min={1} max={100} suffix="%" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="timeLimitMinutes" label="Thời gian làm bài" rules={[{ required: true }]}>
              <InputNumber min={1} max={600} suffix="phút" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="maxAttempts" label="Số lượt tối đa" rules={[{ required: true }]}>
              <InputNumber min={1} max={20} suffix="lượt" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="window" label="Thời gian mở quiz" extra="Để trống nếu không giới hạn. Lượt làm đang dở sẽ tự nộp khi tới thời điểm đóng.">
          <DatePicker.RangePicker showTime={{ format: "HH:mm" }} format="DD/MM/YYYY HH:mm" allowEmpty={[true, true]} style={{ width: "100%" }} />
        </Form.Item>
        <Button type="primary" loading={busy} onClick={saveSettings}>Lưu cài đặt</Button>
      </Form>
    </Card>
  );

  const infoTab = (
    <Card style={{ maxWidth: 720 }}>
      <Form form={iForm} layout="vertical" initialValues={{ title: quiz.title, lessonIds: quiz.sourceIds }}>
        <Form.Item name="title" label="Tên quiz" rules={[{ required: true, message: "Nhập tên quiz." }]}>
          <Input />
        </Form.Item>
        <Form.Item name="lessonIds" label="Bài học nguồn" rules={[{ required: true, message: "Chọn ít nhất 1 bài học." }]} extra="Video chưa có transcript không chọn được.">
          <Checkbox.Group style={{ width: "100%" }}>
            <Flex vertical gap={8}>
              {course.lessons.map((l) => (
                <Checkbox key={l.id} value={l.id} disabled={l.type === "VIDEO" && !l.hasTranscript}>{l.title}</Checkbox>
              ))}
            </Flex>
          </Checkbox.Group>
        </Form.Item>
        <Button type="primary" loading={busy} onClick={saveInfo}>Lưu thông tin</Button>
      </Form>
    </Card>
  );

  const attemptsTab = (
    <Table
      rowKey="id"
      dataSource={attempts}
      pagination={{ pageSize: 15, hideOnSinglePage: true }}
      locale={{ emptyText: "Chưa có lượt làm bài." }}
      columns={[
        { title: "Thành viên / Nhóm", render: (_, a) => (<><Typography.Text strong>{a.name}</Typography.Text><br /><Typography.Text type="secondary">{a.group ?? "—"}</Typography.Text></>) },
        { title: "Lượt", dataIndex: "number" },
        { title: "Bắt đầu", render: (_, a) => fmtDateTime(a.startedAt) },
        { title: "Nộp bài", render: (_, a) => (a.status === "IN_PROGRESS" ? <Tag color="processing">Đang làm</Tag> : <>{fmtDateTime(a.submittedAt)}{a.auto && <Tag style={{ marginLeft: 6 }}>Tự nộp</Tag>}</>) },
        { title: "Điểm", render: (_, a) => (a.score === null ? "—" : `${a.score}%`) },
        { title: "Kết quả", render: (_, a) => <PassTag passed={a.passed} /> },
      ]}
    />
  );

  return (
    <>
      <PageHeader
        crumbs={[{ title: "Khóa học", href: "/admin/courses" }, { title: course.title, href: `/admin/courses/${course.id}?tab=quizzes` }, { title: quiz.title }]}
        title={quiz.title}
        meta={
          <Flex gap={12} align="center">
            <CourseStatusTag status={quiz.status} />
            <Typography.Text type="secondary">{quiz.opensAt || quiz.closesAt ? `Mở ${fmtDateTime(quiz.opensAt)} – ${fmtDateTime(quiz.closesAt)}` : "Không giới hạn thời gian mở"}</Typography.Text>
          </Flex>
        }
        extra={
          <>
            <Button type={quiz.status === "DRAFT" ? "primary" : "default"} onClick={toggleStatus}>{quiz.status === "DRAFT" ? "Xuất bản quiz" : "Chuyển về nháp"}</Button>
            <Dropdown menu={{ items: [{ key: "del", danger: true, icon: <DeleteOutlined />, label: "Xóa quiz", onClick: remove }] }}>
              <Button icon={<MoreOutlined />} aria-label="Thêm" />
            </Dropdown>
          </>
        }
      />
      <Descriptions
        bordered
        size="small"
        column={4}
        style={{ marginBottom: 20 }}
        items={[
          { key: "q", label: "Câu hỏi đã duyệt", children: `${counts.APPROVED} câu` },
          { key: "p", label: "Điểm đạt", children: `${quiz.passScore}%` },
          { key: "t", label: "Thời gian", children: `${quiz.timeLimitMinutes} phút` },
          { key: "a", label: "Tối đa", children: `${quiz.maxAttempts} lượt` },
        ]}
      />
      <Tabs
        defaultActiveKey={tab}
        onChange={(k) => router.replace(`/admin/courses/${course.id}/quizzes/${quiz.id}?tab=${k}`, { scroll: false })}
        items={[
          { key: "questions", label: `Câu hỏi · ${counts.ALL}`, children: questionsTab },
          { key: "settings", label: "Cài đặt", children: settingsTab },
          { key: "info", label: `Thông tin & bài học nguồn · ${quiz.sourceIds.length}`, children: infoTab },
          { key: "attempts", label: `Lượt làm · ${attempts.length}`, children: attemptsTab },
        ]}
      />
      <FootNote>AI chỉ soạn nháp câu hỏi. Điểm, giờ làm bài và số lượt do hệ thống tính. Mọi lần gọi AI đều được ghi log.</FootNote>

      <Modal
        open={editing !== null}
        title="Sửa câu hỏi"
        width={680}
        onCancel={() => setEditing(null)}
        destroyOnHidden
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setEditing(null)}>Hủy</Button>
            <Button loading={busy} onClick={() => saveEdit(false)}>Lưu</Button>
            <Button type="primary" loading={busy} onClick={() => saveEdit(true)}>Lưu và duyệt</Button>
          </Flex>
        }
      >
        <Form form={qForm} layout="vertical">
          <Form.Item name="text" label="Câu hỏi" rules={[{ required: true, min: 5, message: "Câu hỏi quá ngắn." }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="correctIndex" label="Đáp án (chọn đáp án đúng)" rules={[{ required: true }]}>
            <Radio.Group style={{ width: "100%" }}>
              <Flex vertical gap={8}>
                {[0, 1, 2, 3].map((i) => (
                  <Flex key={i} gap={8} align="center">
                    <Radio value={i}>{LETTERS[i]}</Radio>
                    <Form.Item name={["options", i]} noStyle rules={[{ required: true, message: "Không để trống đáp án." }]}>
                      <Input />
                    </Form.Item>
                  </Flex>
                ))}
              </Flex>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="explanation" label="Giải thích">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
