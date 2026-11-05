import Link from "next/link";
import { Alert, Button, Card, Col, Flex, Progress, Row, Tag } from "antd";
import { CheckCircleFilled, FileTextOutlined, LockOutlined, PlayCircleOutlined } from "@/components/icons";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { courseProgress } from "@/lib/access";
import { finalizeExpiredAttempts } from "@/lib/quiz";
import { fmtDateTime } from "@/lib/format";
import NoAccess from "@/components/NoAccess";
import { FootNote, PageHeader, PassTag, Text } from "@/components/ui";
import { courseGuard } from "./guard";

export default async function CourseOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireMember();
  const g = await courseGuard(user, id);
  if (!g.ok) return <NoAccess assigned={g.assigned} />;
  await finalizeExpiredAttempts({ userId: user.id });
  const [lessons, done, p] = await Promise.all([
    prisma.lesson.findMany({ where: { courseId: id }, orderBy: { position: "asc" } }),
    prisma.lessonProgress.findMany({ where: { userId: user.id, lesson: { courseId: id } } }),
    courseProgress(user.id, id),
  ]);
  const doneIds = new Set(done.map((d) => d.lessonId));
  const next = lessons.find((l) => !doneIds.has(l.id)) ?? lessons[0];
  const locked = g.lock.locked;
  const pct = lessons.length ? Math.round((doneIds.size / lessons.length) * 100) : 0;

  return (
    <>
      <PageHeader
        crumbs={[{ title: "Khóa học của tôi", href: "/learn/courses" }, { title: g.course.title }]}
        title={g.course.title}
        description={g.course.description}
        meta={
          <Flex gap={8} align="center" wrap>
            <Tag>{g.course.category.name}</Tag>
            <Text type="secondary">{lessons.length} bài học · {p.quizzes.length} quiz</Text>
            {g.lock.activeDeadline && <Tag color="warning">Hạn chót {fmtDateTime(g.lock.activeDeadline)}</Tag>}
          </Flex>
        }
        extra={!locked && next ? <Button type="primary" size="large" href={`/learn/courses/${id}/lessons/${next.id}`}>{doneIds.size > 0 ? "Tiếp tục học" : "Bắt đầu học"}</Button> : undefined}
      />
      {locked && (
        <Alert
          type="error"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 20 }}
          title="Khóa học đã quá hạn, bạn không thể học tiếp."
          description={`Hạn chót là ${fmtDateTime(g.lock.deadline)}. Bạn vẫn xem được kết quả quiz đã làm. Liên hệ quản trị viên nếu cần gia hạn.`}
        />
      )}
      <Row gutter={24}>
        <Col span={15}>
          <Card title="Bài học" extra={<Text type="secondary">{doneIds.size} / {lessons.length} bài · {pct}%</Text>}>
            <Progress percent={pct} showInfo={false} style={{ marginTop: -8, marginBottom: 12 }} />
            <Flex vertical gap={4}>
              {lessons.map((l, i) => {
                const row = (
                  <Flex align="center" gap={12} style={{ padding: "10px 12px", borderRadius: 8 }} className={locked ? undefined : "lh-clickable"}>
                    {doneIds.has(l.id) ? <CheckCircleFilled style={{ color: "#206347", fontSize: 18 }} /> : l.type === "ARTICLE" ? <FileTextOutlined style={{ fontSize: 18 }} /> : <PlayCircleOutlined style={{ fontSize: 18 }} />}
                    <div style={{ flex: 1 }}>
                      <Text strong>{i + 1}. {l.title}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>{l.type === "ARTICLE" ? "Bài viết" : "Video"}{l.durationMinutes ? ` · ${l.durationMinutes} phút` : ""}</Text>
                    </div>
                    {locked && <LockOutlined />}
                  </Flex>
                );
                return locked ? <div key={l.id}>{row}</div> : <Link key={l.id} href={`/learn/courses/${id}/lessons/${l.id}`}>{row}</Link>;
              })}
            </Flex>
          </Card>
        </Col>
        <Col span={9}>
          <Card title="Quiz">
            {p.quizzes.length === 0 ? (
              <Text type="secondary">Khóa học chưa có quiz.</Text>
            ) : (
              <Flex vertical gap={12}>
                {p.quizzes.map((q) => (
                  <Card key={q.id} size="small">
                    <Text strong>{q.title}</Text>
                    <Flex justify="space-between" align="center" style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {q.bestScore !== null ? `Điểm cao nhất ${q.bestScore}%` : "Chưa làm"} · đã dùng {q.attemptsUsed}/{q.maxAttempts} lượt
                      </Text>
                      {q.bestScore !== null && <PassTag passed={q.passed} />}
                    </Flex>
                    <Button block style={{ marginTop: 10 }} href={`/learn/quizzes/${q.id}`}>{locked ? "Xem kết quả" : "Xem quiz"}</Button>
                  </Card>
                ))}
              </Flex>
            )}
          </Card>
        </Col>
      </Row>
      <FootNote>Tiến độ tính theo số bài bạn đã đánh dấu học xong.</FootNote>
    </>
  );
}
