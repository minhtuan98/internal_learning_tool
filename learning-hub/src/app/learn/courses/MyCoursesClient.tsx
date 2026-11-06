"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card, Col, Empty, Flex, Input, Progress, Row, Select, Tabs, Tag, Typography, theme } from "antd";
import { ArrowRightOutlined, BookOutlined, CheckCircleOutlined, SyncOutlined } from "@ant-design/icons";
import { DeadlineTag, FootNote, PageHeader } from "@/components/ui";

/**
 * Spotlight Card (after React Bits "SpotlightCard"): the pointer position is written to --mouse-x / --mouse-y
 * and a radial-gradient in globals.css (.lh-spotlight::before) draws the light there.
 * Skipped under prefers-reduced-motion, where the light stays centred (static version).
 */
function trackSpotlight(e: React.MouseEvent<HTMLDivElement>) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mouse-x", `${e.clientX - r.left}px`);
  el.style.setProperty("--mouse-y", `${e.clientY - r.top}px`);
}

type C = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  category: string;
  coverImage: string;
  lessonsTotal: number;
  lessonsDone: number;
  quizzes: number;
  lastActivity: Date | null;
  nextLesson: { id: string; title: string; position: number; minutes: number | null; type: string } | null;
  deadline: Date | null;
  complete: boolean;
};

export default function MyCoursesClient({ name, cards, categories }: { name: string; cards: C[]; categories: { id: string; name: string }[] }) {
  const { token } = theme.useToken();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const learning = (c: C) => c.lessonsDone > 0 && c.lessonsDone < c.lessonsTotal;
  const finished = (c: C) => c.lessonsTotal > 0 && c.lessonsDone >= c.lessonsTotal;
  const shown = useMemo(
    () => cards.filter((c) => (tab === "all" || (tab === "learning" ? learning(c) : finished(c))) && (!cat || c.categoryId === cat) && (!q || c.title.toLowerCase().includes(q.toLowerCase()))),
    [cards, tab, cat, q],
  );
  const resume = [...cards].filter((c) => c.nextLesson && c.lastActivity).sort((a, b) => new Date(b.lastActivity!).getTime() - new Date(a.lastActivity!).getTime())[0];

  return (
    <>
      <PageHeader title="Mỗi ngày, thêm một điều mới." description={`Chào ${name}. Tiếp tục học tập theo nhịp độ của bạn.`} />
      {resume?.nextLesson && (
        // Glass Card (effect-labs fx-0301, adapted): frosted card over soft brand-colour orbs.
        <div className="lh-glass-scene" style={{ marginBottom: 16 }}>
          <span className="lh-glass-orb lh-glass-orb--1" aria-hidden="true" />
          <span className="lh-glass-orb lh-glass-orb--2" aria-hidden="true" />
          <span className="lh-glass-orb lh-glass-orb--3" aria-hidden="true" />
        <Card className="lh-glass-card">
          <Flex align="center" gap={16}>
            <span className="lh-brand-tile" style={{ width: 48, height: 48, borderRadius: 12, fontSize: 20 }}><BookOutlined /></span>
            <div style={{ flex: 1 }}>
              <Typography.Text strong style={{ color: token.colorPrimary, fontSize: 12, letterSpacing: 0.4 }}>TIẾP TỤC TỪ NƠI BẠN DỪNG LẠI</Typography.Text>
              <Typography.Title level={4} style={{ margin: "2px 0" }}>{resume.nextLesson.title}</Typography.Title>
              <Typography.Text type="secondary">
                {resume.title} · Bài {resume.lessonsDone + 1} / {resume.lessonsTotal}
                {resume.nextLesson.minutes ? ` · ${resume.nextLesson.minutes} phút ${resume.nextLesson.type === "ARTICLE" ? "đọc" : "xem"}` : ""}
              </Typography.Text>
            </div>
            <Button type="primary" icon={<ArrowRightOutlined />} href={`/learn/courses/${resume.id}/lessons/${resume.nextLesson.id}`}>Tiếp tục học</Button>
          </Flex>
        </Card>
        </div>
      )}
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: "all", label: `Tất cả · ${cards.length}` },
          { key: "learning", label: `Đang học · ${cards.filter(learning).length}` },
          { key: "done", label: `Đã học hết bài · ${cards.filter(finished).length}` },
        ]}
      />
      <Flex gap={12} style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="Tìm khóa học của bạn..." style={{ width: 360 }} onChange={(e) => setQ(e.target.value)} />
        <Select allowClear placeholder="Tất cả danh mục" style={{ width: 200 }} value={cat} onChange={setCat} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
      </Flex>
      {shown.length === 0 ? (
        <Card><Empty description={cards.length ? "Không có khóa học phù hợp." : "Bạn chưa được mở khóa học nào. Liên hệ quản trị viên nếu cần."} /></Card>
      ) : (
        <Row gutter={[16, 16]} className="lh-stagger">
          {shown.map((c) => {
            const pct = c.lessonsTotal ? Math.round((c.lessonsDone / c.lessonsTotal) * 100) : 0;
            return (
              <Col span={8} key={c.id}>
                <Card
                  hoverable
                  className="lh-spotlight"
                  onMouseMove={trackSpotlight}
                  style={{ height: "100%" }}
                  cover={<img src={`/api/files/${c.coverImage}`} alt="" style={{ aspectRatio: "16 / 9", objectFit: "cover" }} />}
                  styles={{ body: { padding: 16 } }}
                >
                  <Flex justify="space-between" align="center">
                    <Typography.Text strong style={{ color: token.colorPrimary, fontSize: 13 }}>{c.category}</Typography.Text>
                    {finished(c) ? <Tag color="success" icon={<CheckCircleOutlined />}>Đã học hết bài</Tag> : c.lessonsDone > 0 ? <Tag color="processing" icon={<SyncOutlined />}>Đang học</Tag> : <Tag>Chưa bắt đầu</Tag>}
                  </Flex>
                  <Typography.Title level={5} style={{ margin: "8px 0 4px" }}>{c.title}</Typography.Title>
                  <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>{c.description}</Typography.Paragraph>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{c.lessonsTotal} bài học · {c.quizzes} quiz</Typography.Text>
                  <Flex justify="space-between" style={{ marginTop: 8 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Đã học {c.lessonsDone} / {c.lessonsTotal} bài</Typography.Text>
                    <Typography.Text strong style={{ fontSize: 12 }}>{pct}%</Typography.Text>
                  </Flex>
                  <Progress percent={pct} showInfo={false} />
                  <Flex justify="space-between" align="center" style={{ marginTop: 8 }}>
                    {c.deadline ? <DeadlineTag deadline={c.deadline} done={c.complete} /> : <span />}
                    <Link href={`/learn/courses/${c.id}`}><Button>{c.lessonsDone > 0 && !finished(c) ? "Tiếp tục" : "Xem khóa học"}</Button></Link>
                  </Flex>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
      <FootNote>Chỉ hiển thị khóa học đã xuất bản mà bạn có quyền truy cập. Tiến độ thể hiện số bài đã học, không thay kết quả quiz.</FootNote>
    </>
  );
}
