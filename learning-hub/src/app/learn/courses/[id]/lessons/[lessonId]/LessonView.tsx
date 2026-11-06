"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Col, Flex, Row, Typography } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleFilled, CheckOutlined, FileTextOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { PageHeader, report } from "@/components/ui";
import { toEmbedUrl } from "@/lib/video";
import { completeLesson } from "@/server/member-actions";

type Lesson = { id: string; title: string; type: string; articleBody: string | null; videoUrl: string | null; durationMinutes: number | null };

export default function LessonView({ course, lesson, outline, prevId, nextId }: { course: { id: string; title: string }; lesson: Lesson; outline: { id: string; title: string; type: string; done: boolean }[]; prevId: string | null; nextId: string | null }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const done = outline.find((o) => o.id === lesson.id)?.done ?? false;
  const embed = lesson.videoUrl ? toEmbedUrl(lesson.videoUrl) : null;

  const complete = async (thenNext: boolean) => {
    setBusy(true);
    const r = await completeLesson(lesson.id);
    setBusy(false);
    if (!report(message, r)) return;
    if (thenNext && nextId) router.push(`/learn/courses/${course.id}/lessons/${nextId}`);
    else router.refresh();
  };

  return (
    <>
      <PageHeader
        crumbs={[{ title: "Khóa học của tôi", href: "/learn/courses" }, { title: course.title, href: `/learn/courses/${course.id}` }, { title: lesson.title }]}
        title={lesson.title}
        description={`${lesson.type === "ARTICLE" ? "Bài viết" : "Video"}${lesson.durationMinutes ? ` · ${lesson.durationMinutes} phút` : ""}`}
      />
      <Row gutter={24}>
        <Col span={17}>
          <Card>
            {lesson.type === "ARTICLE" ? (
              <div className="lh-article" dangerouslySetInnerHTML={{ __html: lesson.articleBody ?? "" }} />
            ) : embed ? (
              <>
                <div className="lh-video">
                  <iframe src={embed} title={lesson.title} allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
                </div>
                <Typography.Text type="secondary" style={{ display: "block", marginTop: 12, fontSize: 12 }}>
                  Không xem được video? Hãy đăng nhập Google trên trình duyệt này, hoặc báo quản trị viên kiểm tra quyền chia sẻ của video.
                </Typography.Text>
              </>
            ) : (
              <Alert type="error" showIcon title="Không phát được video" description="Link video không hợp lệ. Hãy báo quản trị viên." />
            )}
          </Card>
          <Flex justify="space-between" align="center" style={{ marginTop: 16 }}>
            <Button icon={<ArrowLeftOutlined />} disabled={!prevId} href={prevId ? `/learn/courses/${course.id}/lessons/${prevId}` : undefined}>Bài trước</Button>
            <Flex gap={8}>
              {done ? (
                <Button disabled icon={<CheckCircleFilled />}>Đã học xong</Button>
              ) : (
                <Button icon={<CheckOutlined />} loading={busy} onClick={() => complete(false)}>Đánh dấu đã học xong</Button>
              )}
              {nextId ? (
                <Button type="primary" icon={<ArrowRightOutlined />} iconPlacement="end" loading={busy} onClick={() => (done ? router.push(`/learn/courses/${course.id}/lessons/${nextId}`) : complete(true))}>
                  {done ? "Bài tiếp theo" : "Học xong, sang bài tiếp"}
                </Button>
              ) : (
                <Button type="primary" href={`/learn/courses/${course.id}`}>Về tổng quan khóa học</Button>
              )}
            </Flex>
          </Flex>
        </Col>
        <Col span={7}>
          <Card title="Nội dung khóa học" size="small" style={{ position: "sticky", top: 96 }}>
            <Flex vertical gap={2}>
              {outline.map((o, i) => (
                <Link key={o.id} href={`/learn/courses/${course.id}/lessons/${o.id}`}>
                  <Flex gap={10} align="center" style={{ padding: "8px 10px", borderRadius: 6, background: o.id === lesson.id ? "var(--ant-color-fill-tertiary)" : undefined }}>
                    {o.done ? <CheckCircleFilled style={{ color: "var(--ant-color-success)" }} /> : o.type === "ARTICLE" ? <FileTextOutlined /> : <PlayCircleOutlined />}
                    <Typography.Text strong={o.id === lesson.id} style={{ fontSize: 13 }}>{i + 1}. {o.title}</Typography.Text>
                  </Flex>
                </Link>
              ))}
            </Flex>
          </Card>
        </Col>
      </Row>
    </>
  );
}
