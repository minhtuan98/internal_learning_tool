"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Col, Flex, Form, Input, InputNumber, Row, Spin, Typography } from "antd";
import { CloudDownloadOutlined } from "@ant-design/icons";
import { RichTextEditor } from "@/components/editors";
import { FootNote, PageHeader, report } from "@/components/ui";
import { toEmbedUrl, videoSource } from "@/lib/video";
import { fetchTranscript, saveLesson } from "@/server/content-actions";

type L = { id: string; title: string; articleBody: string; videoUrl: string; transcript: string; durationMinutes: number | null };

export default function LessonEditor({ course, lesson, type }: { course: { id: string; title: string }; lesson: L | null; type: "ARTICLE" | "VIDEO" }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [body, setBody] = useState(lesson?.articleBody ?? "");
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<{ state: "idle" | "loading" | "error" | "ok"; error?: string }>({ state: "idle" });
  const videoUrl = Form.useWatch("videoUrl", form) as string | undefined;
  const embed = videoUrl ? toEmbedUrl(videoUrl) : null;
  const isArticle = type === "ARTICLE";

  const save = async () => {
    const v = await form.validateFields();
    setBusy(true);
    const r = await saveLesson(course.id, lesson?.id ?? null, isArticle ? { type, title: v.title, articleBody: body, durationMinutes: v.durationMinutes ?? null } : { type, ...v, durationMinutes: v.durationMinutes ?? null });
    setBusy(false);
    if (report(message, r)) router.push(`/admin/courses/${course.id}?tab=lessons`);
  };

  const autoTranscript = async () => {
    if (!lesson) return void message.info("Lưu bài học trước khi lấy transcript tự động.");
    setTx({ state: "loading" });
    const r = await fetchTranscript(lesson.id);
    if (r.ok && r.data) {
      form.setFieldValue("transcript", r.data.transcript);
      setTx({ state: "ok" });
    } else setTx({ state: "error", error: r.ok ? undefined : r.error });
  };

  return (
    <>
      <PageHeader
        crumbs={[{ title: "Khóa học", href: "/admin/courses" }, { title: course.title, href: `/admin/courses/${course.id}` }, { title: lesson ? lesson.title : isArticle ? "Bài viết mới" : "Video mới" }]}
        title={lesson ? (isArticle ? "Biên tập bài viết" : "Biên tập video") : isArticle ? "Thêm bài viết" : "Thêm video"}
        extra={
          <>
            <Button onClick={() => router.push(`/admin/courses/${course.id}`)}>Hủy</Button>
            <Button type="primary" loading={busy} onClick={save}>Lưu bài học</Button>
          </>
        }
      />
      <Form form={form} layout="vertical" initialValues={lesson ?? {}}>
        <Row gutter={24}>
          <Col span={16}>
            <Card>
              <Form.Item name="title" label="Tên bài học" rules={[{ required: true, message: "Nhập tên bài học." }]} extra="Không trùng với bài khác trong khóa.">
                <Input maxLength={150} />
              </Form.Item>
              {isArticle ? (
                <Form.Item label="Nội dung" required extra="Ảnh chèn vào bài: JPG, PNG hoặc WebP, tối đa 2 MB.">
                  <RichTextEditor value={body} onChange={setBody} />
                </Form.Item>
              ) : (
                <>
                  <Form.Item
                    name="videoUrl"
                    label="Link video"
                    rules={[{ required: true, message: "Dán link video." }, { validator: (_, v) => (!v || toEmbedUrl(v) ? Promise.resolve() : Promise.reject(new Error("Link phải là YouTube hoặc Google Drive."))) }]}
                    extra="YouTube để chế độ “Không công khai”, Google Drive để “Bất kỳ ai có đường liên kết”. Link chỉ hiện bên trong nền tảng."
                  >
                    <Input placeholder="https://www.youtube.com/watch?v=... hoặc https://drive.google.com/file/d/..." />
                  </Form.Item>
                  {embed && (
                    <div className="lh-video" style={{ marginBottom: 24 }}>
                      <iframe src={embed} title="Xem trước video" allow="encrypted-media; fullscreen" />
                    </div>
                  )}
                  <Form.Item
                    name="transcript"
                    label={
                      <Flex justify="space-between" align="center" style={{ width: "100%" }}>
                        <span>Transcript</span>
                      </Flex>
                    }
                    extra="Dán nội dung lời thoại của video. Video chưa có transcript không thể làm nguồn tạo câu hỏi AI."
                  >
                    <Input.TextArea rows={10} placeholder="Dán transcript tại đây..." />
                  </Form.Item>
                  <Card size="small" title="Lấy transcript tự động (Release 2)" style={{ marginBottom: 8 }}>
                    {tx.state === "loading" ? (
                      <Spin><div style={{ padding: 16 }}>Đang lấy transcript…</div></Spin>
                    ) : tx.state === "error" ? (
                      <Alert
                        type="error"
                        showIcon
                        title="Không lấy được transcript cho video này."
                        description={tx.error}
                        action={
                          <Flex vertical gap={6}>
                            <Button size="small" onClick={autoTranscript}>Thử lại</Button>
                            <Button size="small" onClick={() => { setTx({ state: "idle" }); form.getFieldInstance("transcript")?.focus(); }}>Dán thủ công</Button>
                          </Flex>
                        }
                      />
                    ) : tx.state === "ok" ? (
                      <Alert type="success" showIcon title="Đã điền transcript. Bạn vẫn có thể sửa trước khi lưu." />
                    ) : (
                      <Button icon={<CloudDownloadOutlined />} onClick={autoTranscript}>Lấy transcript tự động</Button>
                    )}
                  </Card>
                </>
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Thông tin">
              <Form.Item name="durationMinutes" label={isArticle ? "Thời gian đọc (phút)" : "Thời lượng (phút)"}>
                <InputNumber min={1} max={600} style={{ width: "100%" }} />
              </Form.Item>
              <Typography.Text type="secondary">Loại: {isArticle ? "Bài viết" : `Video${videoUrl ? ` · ${videoSource(videoUrl)}` : ""}`}</Typography.Text>
            </Card>
          </Col>
        </Row>
      </Form>
      <FootNote>Bài học không có trạng thái riêng: hiển thị khi khóa học được xuất bản. Cách lấy transcript tự động cho video riêng tư đang chờ quyết định (HLD-Q7).</FootNote>
    </>
  );
}
