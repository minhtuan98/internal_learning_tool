"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Drawer, Flex, Form, Input, Select } from "antd";
import { CoverUpload } from "@/components/editors";
import { report } from "@/components/ui";
import { saveCourse } from "@/server/content-actions";

export type CourseFormValue = { id: string; title: string; description: string; coverImage: string; categoryId: string };

export default function CourseFormDrawer({
  open,
  course,
  categories,
  onClose,
}: {
  open: boolean;
  course: CourseFormValue | null;
  categories: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      if (course) form.setFieldsValue(course);
    }
  }, [open, course, form]);

  const submit = async () => {
    const v = await form.validateFields();
    setBusy(true);
    const r = await saveCourse(course?.id ?? null, v);
    setBusy(false);
    if (!report(message, r)) return;
    onClose();
    if (!course && r.ok && r.data) router.push(`/admin/courses/${r.data.id}`);
    else router.refresh();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={560}
      title={course ? "Sửa thông tin khóa học" : "Tạo khóa học"}
      destroyOnHidden
      footer={
        <Flex justify="flex-end" gap={8}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={busy} onClick={submit}>{course ? "Lưu thay đổi" : "Tạo khóa học"}</Button>
        </Flex>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="Tên khóa học" rules={[{ required: true, message: "Nhập tên khóa học." }]} extra="Tên khóa học không được trùng.">
          <Input maxLength={120} showCount />
        </Form.Item>
        <Form.Item name="description" label="Mô tả" rules={[{ required: true, message: "Nhập mô tả." }]}>
          <Input.TextArea rows={4} maxLength={500} showCount />
        </Form.Item>
        <Form.Item name="categoryId" label="Danh mục" rules={[{ required: true, message: "Chọn danh mục." }]}>
          <Select placeholder="Chọn danh mục" options={categories.map((c) => ({ value: c.id, label: c.name }))} />
        </Form.Item>
        <Form.Item name="coverImage" label="Ảnh bìa" rules={[{ required: true, message: "Tải ảnh bìa lên." }]}>
          <CoverUpload />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
