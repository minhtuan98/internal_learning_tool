"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Col, Dropdown, Flex, Input, Row, Select, Table, Tabs, Typography } from "antd";
import { DeleteOutlined, EditOutlined, MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { CourseStatusTag, FootNote, KpiCard, PageHeader, report } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { deleteCourse } from "@/server/content-actions";
import CourseFormDrawer, { type CourseFormValue } from "./CourseForm";

type R = CourseFormValue & { category: string; status: string; lessons: number; quizzes: number; people: number; updatedAt: Date; updatedBy: string | null };

export default function CoursesClient({ rows, categories }: { rows: R[]; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [tab, setTab] = useState("ALL");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; course: CourseFormValue | null }>({ open: false, course: null });

  const data = useMemo(
    () => rows.filter((r) => (tab === "ALL" || r.status === tab) && (!cat || r.categoryId === cat) && (!q || r.title.toLowerCase().includes(q.toLowerCase()))),
    [rows, tab, cat, q],
  );
  const published = rows.filter((r) => r.status === "PUBLISHED").length;

  const remove = (r: R) =>
    modal.confirm({
      title: `Xóa khóa học "${r.title}"?`,
      content: "Toàn bộ bài học và quiz trong khóa sẽ bị xóa. Không thể hoàn tác.",
      okText: "Xóa khóa học",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        if (report(message, await deleteCourse(r.id))) router.refresh();
      },
    });

  return (
    <>
      <PageHeader
        crumbs={[{ title: "Không gian học tập" }, { title: "Khóa học" }]}
        title="Khóa học"
        description="Quản lý nội dung, quyền truy cập và xuất bản tại một nơi."
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawer({ open: true, course: null })}>Tạo khóa học</Button>}
      />
      <Row gutter={16} className="lh-stagger" style={{ marginBottom: 16 }}>
        <Col span={8}><KpiCard label="Tổng khóa học" value={rows.length} /></Col>
        <Col span={8}><KpiCard label="Đã xuất bản" value={published} /></Col>
        <Col span={8}><KpiCard label="Bản nháp" value={rows.length - published} /></Col>
      </Row>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: "ALL", label: `Tất cả · ${rows.length}` },
          { key: "PUBLISHED", label: `Đã xuất bản · ${published}` },
          { key: "DRAFT", label: `Bản nháp · ${rows.length - published}` },
        ]}
      />
      <Flex gap={12} style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="Tìm khóa học..." style={{ width: 320 }} onChange={(e) => setQ(e.target.value)} />
        <Select allowClear placeholder="Tất cả danh mục" style={{ width: 200 }} value={cat} onChange={setCat} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
      </Flex>
      <Table
        rowKey="id"
        dataSource={data}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        locale={{ emptyText: rows.length ? "Không có khóa học phù hợp bộ lọc." : "Chưa có khóa học nào. Bấm “Tạo khóa học” để bắt đầu." }}
        onRow={(r) => ({ onClick: () => router.push(`/admin/courses/${r.id}`), style: { cursor: "pointer" } })}
        columns={[
          {
            title: "Khóa học",
            render: (_, r) => (
              <Flex gap={12} align="center">
                <img src={`/api/files/${r.coverImage}`} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6 }} />
                <div>
                  <Link href={`/admin/courses/${r.id}`} onClick={(e) => e.stopPropagation()}><Typography.Text strong>{r.title}</Typography.Text></Link>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.category}</Typography.Text>
                </div>
              </Flex>
            ),
          },
          { title: "Trạng thái", render: (_, r) => <CourseStatusTag status={r.status} /> },
          { title: "Bài học / Quiz", render: (_, r) => `${r.lessons} / ${r.quizzes}` },
          { title: "Truy cập", render: (_, r) => `${r.people} người` },
          { title: "Cập nhật", render: (_, r) => (<><div>{fmtDateTime(r.updatedAt)}</div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.updatedBy ?? ""}</Typography.Text></>) },
          {
            title: "",
            width: 56,
            render: (_, r) => (
              <span onClick={(e) => e.stopPropagation()}>
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      { key: "edit", icon: <EditOutlined />, label: "Sửa thông tin", onClick: () => setDrawer({ open: true, course: r }) },
                      ...(r.status === "DRAFT" ? [{ key: "del", icon: <DeleteOutlined />, label: "Xóa khóa học", danger: true, onClick: () => remove(r) }] : []),
                    ],
                  }}
                >
                  <Button type="text" icon={<MoreOutlined />} aria-label="Thao tác" />
                </Dropdown>
              </span>
            ),
          },
        ]}
      />
      <FootNote>Chỉ khóa học đã xuất bản mới hiển thị cho người có quyền truy cập. Bản nháp luôn riêng tư.</FootNote>
      <CourseFormDrawer open={drawer.open} course={drawer.course} categories={categories} onClose={() => setDrawer({ open: false, course: null })} />
    </>
  );
}
