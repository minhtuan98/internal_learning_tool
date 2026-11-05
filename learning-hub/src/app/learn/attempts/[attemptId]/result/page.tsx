import { notFound, redirect } from "next/navigation";
import { Button, Card, Col, Flex, Result, Row, Tag } from "antd";
import { CheckCircleFilled, CloseCircleFilled, MinusCircleOutlined } from "@/components/icons";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { checkCanStart, finalizeExpiredAttempts } from "@/lib/quiz";
import { fmtDateTime, fmtDuration } from "@/lib/format";
import { FootNote, PageHeader, Text } from "@/components/ui";

/** Score and pass / fail (PRD scope 10). Correct answers are not revealed so retakes stay meaningful. */
export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireMember();
  await finalizeExpiredAttempts({ userId: user.id });
  const a = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { quiz: { include: { course: true, questions: { where: { reviewStatus: "APPROVED" }, orderBy: { position: "asc" } } } }, answers: true },
  });
  if (!a || a.userId !== user.id) notFound();
  if (a.status !== "SUBMITTED") redirect(`/learn/attempts/${a.id}`);
  const check = await checkCanStart(user, a.quizId);
  const answers = new Map(a.answers.map((x) => [x.questionId, x]));

  return (
    <>
      <PageHeader
        crumbs={[{ title: "Khóa học của tôi", href: "/learn/courses" }, { title: a.quiz.course.title, href: `/learn/courses/${a.quiz.courseId}` }, { title: a.quiz.title, href: `/learn/quizzes/${a.quizId}` }, { title: `Kết quả lượt ${a.number}` }]}
        title={`Kết quả: ${a.quiz.title}`}
      />
      <Row gutter={24}>
        <Col span={10}>
          <Card>
            <Result
              status={a.passed ? "success" : "warning"}
              title={a.passed ? "Bạn đã đạt!" : "Chưa đạt lần này"}
              subTitle={
                <>
                  <div style={{ fontSize: 40, fontWeight: 700, margin: "8px 0" }}>{a.score}%</div>
                  <div>{a.correctCount} / {a.totalCount} câu đúng · Điểm đạt {a.quiz.passScore}%</div>
                  <div>Lượt {a.number} / {a.quiz.maxAttempts} · Nộp lúc {fmtDateTime(a.submittedAt)} · {fmtDuration((a.submittedAt?.getTime() ?? 0) - a.startedAt.getTime())}</div>
                  {a.autoSubmitted && <Tag style={{ marginTop: 8 }}>Tự nộp khi hết giờ</Tag>}
                </>
              }
              extra={
                <Flex gap={8} justify="center" wrap>
                  <Button href={`/learn/courses/${a.quiz.courseId}`}>Về khóa học</Button>
                  {check.ok && !a.passed && <Button type="primary" href={`/learn/quizzes/${a.quizId}`}>Làm lại ({a.quiz.maxAttempts - check.attemptsUsed} lượt còn lại)</Button>}
                </Flex>
              }
            />
          </Card>
        </Col>
        <Col span={14}>
          <Card title="Từng câu">
            <Flex vertical gap={10}>
              {a.quiz.questions.map((q, i) => {
                const ans = answers.get(q.id);
                const icon = !ans ? <MinusCircleOutlined style={{ color: "#8494AD" }} /> : ans.isCorrect ? <CheckCircleFilled style={{ color: "#206347" }} /> : <CloseCircleFilled style={{ color: "#B42318" }} />;
                return (
                  <Flex key={q.id} gap={10} align="flex-start">
                    <span style={{ marginTop: 2 }}>{icon}</span>
                    <div>
                      <Text>Câu {i + 1}. {q.text}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>{!ans ? "Chưa trả lời" : ans.isCorrect ? "Đúng" : "Sai"}</Text>
                    </div>
                  </Flex>
                );
              })}
            </Flex>
          </Card>
        </Col>
      </Row>
      <FootNote>Đáp án đúng không được hiển thị để các lượt làm lại vẫn có ý nghĩa. Ôn lại bài học trước khi làm lại.</FootNote>
    </>
  );
}
