"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Checkbox, Dropdown, Empty, Flex, Form, Input, Modal, Popconfirm, Select, Table, Tabs, Tag, Typography } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RobotOutlined,
  VideoCameraAddOutlined,
} from "@ant-design/icons";
import { CourseStatusTag, FootNote, PageHeader, report } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { deleteLesson, reorderLessons, setCourseAccess, setCourseStatus } from "@/server/content-actions";
import { createQuiz } from "@/server/quiz-actions";
import CourseFormDrawer from "../CourseForm";

type Course = { id: string; title: string; description: string; coverImage: string; categoryId: string; category: string; status: string; updatedAt: Date; updatedBy: string | null };
type Lesson = { id: string; title: string; type: string; hasTranscript: boolean; durationMinutes: number | null };
type Quiz = { id: string; title: string; status: string; approved: number; pending: number; passScore: number; timeLimitMinutes: number; maxAttempts: number; opensAt: Date | null; closesAt: Date | null; people: number };
type Member = { id: string; name: string; email: string; groupId: string | null; group: string | null; status: string };

export default function CourseDetailClient({
  tab,
  course,
  lessons,
  quizzes,
  access,
  members,
  groups,
  categories,
}: {
  tab: string;
  course: Course;
  lessons: Lesson[];
  quizzes: Quiz[];
  access: { userIds: string[]; groupIds: string[] };
  members: Member[];
  groups: { id: string; name: string; count: number }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [editOpen, setEditOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizForm] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [userIds, setUserIds] = useState(access.userIds);
  const [groupIds, setGroupIds] = useState(access.groupIds);

  const peopleWithAccess = useMemo(() => new Set(members.filter((m) => userIds.includes(m.id) || (m.groupId && groupIds.includes(m.groupId))).map((m) => m.id)).size, [members, userIds, groupIds]);
  const accessDirty = JSON.stringify([...userIds].sort()) !== JSON.stringify([...access.userIds].sort()) || JSON.stringify([...groupIds].sort()) !== JSON.stringify([...access.groupIds].sort());

  const toggleStatus = () => {
    const publishing = course.status === "DRAFT";
    modal.confirm({
      title: publishing ? "Xuất bản khóa học?" : "Chuyển khóa học về Bản nháp?",
      content: publishing ? `Khóa học sẽ hiển thị cho ${peopleWithAccess} người có quyền truy cập.` : "Thành viên sẽ không còn thấy khóa học này. Kết quả cũ được giữ.",
      okText: publishing ? "Xuất bản" : "Chuyển về nháp",
      cancelText: "Hủy",
      onOk: async () => {
        if (report(message, await setCourseStatus(course.id, publishing ? "PUBLISHED" : "DRAFT"))) router.refresh();
      },
    });
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const ids = lessons.map((l) => l.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    if (report(message, await reorderLessons(course.id, ids))) router.refresh();
  };

  const submitQuiz = async () => {
    const v = await quizForm.validateFields();
    setBusy(true);
    const r = await createQuiz(course.id, { title: v.title, lessonIds: v.lessonIds ?? [] });
    setBusy(false);
    if (report(message, r) && r.ok && r.data) {
      setQuizOpen(false);
      router.push(`/admin/courses/${course.id}/quizzes/${r.data.id}`);
    }
  };

  const saveAccess = async () => {
    setBusy(true);
    const r = await setCourseAccess(course.id, userIds, groupIds);
    setBusy(false);
    if (report(message, r)) router.refresh();
  };

  const lessonTab = (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Nội dung khóa học</Typography.Title>
          <Typography.Text type="secondary">Dùng mũi tên để đổi thứ tự bài học.</Typography.Text>
        </div>
        <Flex gap={8}>
          <Button icon={<PlusOutlined />} onClick={() => router.push(`/admin/courses/${course.id}/lessons/new-article`)}>Thêm bài viết</Button>
          <Button icon={<VideoCameraAddOutlined />} onClick={() => router.push(`/admin/courses/${course.id}/lessons/new-video`)}>Thêm video</Button>
        </Flex>
      </Flex>
      {lessons.length === 0 ? (
        <Card><Empty description="Khóa học chưa có bài học. Thêm bài viết hoặc video để bắt đầu." /></Card>
      ) : (
        <Flex vertical gap={10}>
          {lessons.map((l, i) => (
            <Card key={l.id} size="small" styles={{ body: { padding: "12px 16px" } }}>
              <Flex align="center" gap={14}>
                <Flex vertical>
                  <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Lên" />
                  <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={i === lessons.length - 1} onClick={() => move(i, 1)} aria-label="Xuống" />
                </Flex>
                {l.type === "ARTICLE" ? <FileTextOutlined style={{ fontSize: 18 }} /> : <PlayCircleOutlined style={{ fontSize: 18 }} />}
                <div style={{ flex: 1 }}>
                  <Typography.Text strong>{i + 1}. {l.title}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {l.type === "ARTICLE" ? "Bài viết" : "Video"}
                    {l.durationMinutes ? ` · ${l.durationMinutes} phút` : ""}
                  </Typography.Text>
                </div>
                {l.type === "VIDEO" &&
                  (l.hasTranscript ? <Tag color="success" icon={<CheckCircleOutlined />}>Có transcript</Tag> : <Tag color="warning" icon={<ClockCircleOutlined />}>Chưa có transcript</Tag>)}
                <Button size="small" onClick={() => router.push(`/admin/courses/${course.id}/lessons/${l.id}`)}>Sửa</Button>
                <Popconfirm
                  title={`Xóa bài "${l.title}"?`}
                  description="Tiến độ học của bài này cũng bị xóa."
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={async () => {
                    if (report(message, await deleteLesson(l.id))) router.refresh();
                  }}
                >
                  <Button size="small" danger type="text" icon={<DeleteOutlined />} aria-label="Xóa" />
                </Popconfirm>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
      <Alert style={{ marginTop: 16 }} type="info" showIcon title="Transcript giúp AI hiểu nội dung video" description="Video chưa có transcript vẫn xem được, nhưng không thể chọn làm nguồn tạo câu hỏi." />
    </>
  );

  const quizTab = (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Quiz của khóa học</Typography.Title>
          <Typography.Text type="secondary">Duyệt câu hỏi và cấu hình trước khi xuất bản cho thành viên.</Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} disabled={lessons.length === 0} onClick={() => { quizForm.resetFields(); setQuizOpen(true); }}>Tạo quiz</Button>
      </Flex>
      <Table
        rowKey="id"
        dataSource={quizzes}
        pagination={false}
        locale={{ emptyText: lessons.length ? "Chưa có quiz nào." : "Thêm bài học trước khi tạo quiz." }}
        columns={[
          { title: "Quiz", render: (_, q) => (<><Typography.Text strong>{q.title}</Typography.Text><br /><Typography.Text type="secondary" style={{ fontSize: 12 }}>{q.opensAt || q.closesAt ? `${fmtDateTime(q.opensAt)} – ${fmtDateTime(q.closesAt)}` : "Không giới hạn thời gian mở"}</Typography.Text></>) },
          { title: "Trạng thái", render: (_, q) => <CourseStatusTag status={q.status} /> },
          { title: "Câu hỏi / Điểm đạt", render: (_, q) => (<>{q.approved} câu · {q.passScore}%{q.pending > 0 && <Tag color="warning" style={{ marginLeft: 8 }}>{q.pending} chờ duyệt</Tag>}</>) },
          { title: "Thời gian / Lượt", render: (_, q) => `${q.timeLimitMinutes} phút · ${q.maxAttempts} lượt` },
          { title: "Đã làm", render: (_, q) => `${q.people} người` },
          { title: "", render: (_, q) => <Button size="small" onClick={() => router.push(`/admin/courses/${course.id}/quizzes/${q.id}`)}>Xem chi tiết</Button> },
        ]}
      />
      <Alert style={{ marginTop: 16 }} type="info" showIcon icon={<RobotOutlined />} title="Câu hỏi AI cần được con người phê duyệt" description="Chỉ câu hỏi đã duyệt mới được đưa vào quiz cho thành viên. Câu bị loại luôn được giữ riêng." />
    </>
  );

  const accessTab = (
    <Card>
      <Typography.Title level={4} style={{ marginTop: 0 }}>Ai được mở khóa học này?</Typography.Title>
      <Typography.Text type="secondary">Mở theo nhóm (quyền đi theo nhóm hiện tại của thành viên) hoặc cho từng người.</Typography.Text>
      <Form layout="vertical" style={{ marginTop: 16, maxWidth: 720 }}>
        <Form.Item label="Nhóm">
          <Checkbox.Group value={groupIds} onChange={(v) => setGroupIds(v as string[])}>
            <Flex gap={12} wrap>
              {groups.map((g) => (
                <Checkbox key={g.id} value={g.id}>{g.name} <Typography.Text type="secondary">({g.count})</Typography.Text></Checkbox>
              ))}
            </Flex>
          </Checkbox.Group>
        </Form.Item>
        <Form.Item label="Từng người" extra="Quyền cấp riêng được giữ khi người đó chuyển nhóm.">
          <Select
            mode="multiple"
            value={userIds}
            onChange={setUserIds}
            placeholder="Tìm theo tên hoặc email"
            optionFilterProp="label"
            options={members.map((m) => ({ value: m.id, label: `${m.name} · ${m.email}${m.group ? ` · ${m.group}` : ""}${m.status === "LOCKED" ? " (đã khóa)" : ""}` }))}
          />
        </Form.Item>
      </Form>
      <Flex align="center" gap={16}>
        <Button type="primary" disabled={!accessDirty} loading={busy} onClick={saveAccess}>Lưu quyền truy cập</Button>
        {accessDirty && <Button onClick={() => { setUserIds(access.userIds); setGroupIds(access.groupIds); }}>Hoàn tác</Button>}
        <Typography.Text type="secondary">{peopleWithAccess} người sẽ mở được khóa học khi đã xuất bản.</Typography.Text>
      </Flex>
      <FootNote>Gỡ quyền: người đang làm quiz dở vẫn được nộp bài và kết quả được tính; sau đó mất quyền. Kết quả cũ được giữ.</FootNote>
    </Card>
  );

  return (
    <>
      <PageHeader
        crumbs={[{ title: "Khóa học", href: "/admin/courses" }, { title: course.title }]}
        title={course.title}
        description={`${course.category} · ${lessons.length} bài học · ${quizzes.length} quiz`}
        meta={
          <Flex gap={12} align="center">
            <CourseStatusTag status={course.status} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{course.updatedBy ? `${course.updatedBy} cập nhật · ` : ""}{fmtDateTime(course.updatedAt)}</Typography.Text>
          </Flex>
        }
        extra={
          <>
            <Button onClick={toggleStatus}>{course.status === "DRAFT" ? "Xuất bản" : "Chuyển về nháp"}</Button>
            <Button type="primary" onClick={() => setEditOpen(true)}>Sửa thông tin</Button>
            <Dropdown menu={{ items: [{ key: "access", label: <Link href={`/admin/assignments?course=${course.id}`}>Xem giao bài của khóa</Link> }] }}>
              <Button icon={<MoreOutlined />} aria-label="Thêm" />
            </Dropdown>
          </>
        }
      />
      <Tabs
        defaultActiveKey={tab}
        onChange={(k) => router.replace(`/admin/courses/${course.id}?tab=${k}`, { scroll: false })}
        items={[
          { key: "lessons", label: `Bài học · ${lessons.length}`, children: lessonTab },
          { key: "quizzes", label: `Quiz · ${quizzes.length}`, children: quizTab },
          { key: "access", label: `Quyền truy cập · ${new Set(members.filter((m) => access.userIds.includes(m.id) || (m.groupId && access.groupIds.includes(m.groupId))).map((m) => m.id)).size}`, children: accessTab },
        ]}
      />
      <CourseFormDrawer open={editOpen} course={course} categories={categories} onClose={() => setEditOpen(false)} />
      <Modal open={quizOpen} title="Tạo quiz" okText="Tạo quiz" cancelText="Hủy" confirmLoading={busy} onOk={submitQuiz} onCancel={() => setQuizOpen(false)} destroyOnHidden width={560}>
        <Form form={quizForm} layout="vertical">
          <Form.Item name="title" label="Tên quiz" rules={[{ required: true, message: "Nhập tên quiz." }]}>
            <Input placeholder="Ví dụ: Kiến thức bảo mật cơ bản" />
          </Form.Item>
          <Form.Item name="lessonIds" label="Bài học nguồn để AI tạo câu hỏi" rules={[{ required: true, message: "Chọn ít nhất 1 bài học." }]} extra="Video chưa có transcript không chọn được.">
            <Checkbox.Group style={{ width: "100%" }}>
              <Flex vertical gap={8}>
                {lessons.map((l) => (
                  <Checkbox key={l.id} value={l.id} disabled={l.type === "VIDEO" && !l.hasTranscript}>
                    {l.title} <Typography.Text type="secondary">· {l.type === "ARTICLE" ? "Bài viết" : l.hasTranscript ? "Video có transcript" : "Video chưa có transcript"}</Typography.Text>
                  </Checkbox>
                ))}
              </Flex>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
