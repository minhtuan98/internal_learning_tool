"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Flex, Input, Modal, Typography } from "antd";
import { ArrowLeftOutlined, EditOutlined, PrinterOutlined } from "@ant-design/icons";
import { report } from "@/components/ui";
import { renameCertificate } from "@/server/certificate-actions";

/** Back + Print / Save as PDF. The document title becomes the suggested PDF file name. */
export default function CertificateToolbar({ back, fileName, number, course, rename }: { back: string; fileName: string; number: string; course: string; rename: { id: string; name: string } | null }) {
  const { message } = App.useApp();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(rename?.name ?? "");
  const [saving, startSaving] = useTransition();
  const save = () =>
    startSaving(async () => {
      if (!rename) return;
      if (report(message, await renameCertificate(rename.id, name))) {
        setEditing(false);
        router.refresh();
      }
    });
  const print = () => {
    const prev = document.title;
    document.title = fileName;
    window.print();
    document.title = prev;
  };
  return (
    <Flex className="lh-noprint" justify="space-between" align="center" gap={16} style={{ maxWidth: 1180, margin: "0 auto 16px" }}>
      <Flex align="center" gap={12} style={{ minWidth: 0 }}>
        <Link href={back}>
          <Button icon={<ArrowLeftOutlined />}>Quay lại</Button>
        </Link>
        <Typography.Text type="secondary" ellipsis>
          {course} · Số {number}
        </Typography.Text>
      </Flex>
      <Flex gap={8}>
        {rename && <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>Sửa tên</Button>}
        <Button type="primary" icon={<PrinterOutlined />} onClick={print}>
          In / Lưu PDF
        </Button>
      </Flex>
      {rename && (
        <Modal open={editing} title="Sửa tên trên chứng chỉ" okText="Lưu" cancelText="Hủy" confirmLoading={saving} onOk={save} onCancel={() => setEditing(false)}>
          <Typography.Paragraph type="secondary">Chỉ đổi tên hiển thị trên chứng chỉ này. Số chứng chỉ và ngày hoàn thành giữ nguyên.</Typography.Paragraph>
          <Input value={name} maxLength={40} showCount onChange={(e) => setName(e.target.value)} onPressEnter={save} autoFocus />
        </Modal>
      )}
    </Flex>
  );
}
