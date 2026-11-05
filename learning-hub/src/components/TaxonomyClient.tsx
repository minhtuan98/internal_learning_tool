"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Flex, Input, Modal, Popconfirm, Select, Table, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { FootNote, PageHeader, report } from "@/components/ui";
import type { ActionResult } from "@/lib/types";

type Row = { id: string; name: string; count: number; members?: { id: string; name: string; email: string }[] };

/** Shared screen for Groups and Categories (unique names, delete only when unused). */
export default function TaxonomyClient({
  kind,
  rows,
  save,
  remove,
  move,
}: {
  kind: "group" | "category";
  rows: Row[];
  save: (id: string | null, name: string) => Promise<ActionResult>;
  remove: (id: string) => Promise<ActionResult>;
  move?: (userIds: string[], groupId: string) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const isGroup = kind === "group";
  const noun = isGroup ? "nhóm" : "danh mục";
  const countLabel = isGroup ? "Thành viên" : "Khóa học";

  const open = (r: Row | "new") => {
    setEditing(r);
    setName(r === "new" ? "" : r.name);
  };
  const submit = async () => {
    setBusy(true);
    const r = await save(editing === "new" ? null : (editing as Row).id, name);
    setBusy(false);
    if (report(message, r)) {
      setEditing(null);
      router.refresh();
    }
  };

  return (
    <>
      <PageHeader
        crumbs={[{ title: "Không gian học tập" }, { title: isGroup ? "Nhóm" : "Danh mục" }]}
        title={isGroup ? "Nhóm" : "Danh mục khóa học"}
        description={isGroup ? "Mỗi thành viên thuộc đúng một nhóm. Nhóm dùng để mở quyền truy cập và giao bài." : "Danh sách cố định để phân loại khóa học. Mỗi khóa học chọn một danh mục."}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => open("new")}>Tạo {noun}</Button>}
      />
      <Table
        rowKey="id"
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: `Chưa có ${noun} nào.` }}
        expandable={
          isGroup
            ? {
                rowExpandable: (r) => (r.members?.length ?? 0) > 0,
                expandedRowRender: (r) => (
                  <Flex vertical gap={8} style={{ padding: "4px 8px" }}>
                    {r.members!.map((m) => (
                      <Flex key={m.id} justify="space-between" align="center">
                        <span>
                          <Typography.Text>{m.name}</Typography.Text> <Typography.Text type="secondary">· {m.email}</Typography.Text>
                        </span>
                        <Select
                          size="small"
                          style={{ width: 200 }}
                          placeholder="Chuyển sang nhóm..."
                          options={rows.filter((g) => g.id !== r.id).map((g) => ({ value: g.id, label: g.name }))}
                          onChange={async (gid: string) => {
                            if (move && report(message, await move([m.id], gid))) router.refresh();
                          }}
                        />
                      </Flex>
                    ))}
                  </Flex>
                ),
              }
            : undefined
        }
        columns={[
          { title: isGroup ? "Tên nhóm" : "Tên danh mục", dataIndex: "name", render: (v) => <Typography.Text strong>{v}</Typography.Text> },
          { title: countLabel, dataIndex: "count", width: 160 },
          {
            title: "Thao tác",
            width: 200,
            render: (_, r) => (
              <Flex gap={8}>
                <Button size="small" icon={<EditOutlined />} onClick={() => open(r)}>Đổi tên</Button>
                <Popconfirm
                  title={`Xóa ${noun} "${r.name}"?`}
                  description={r.count > 0 ? `Chưa xóa được: còn ${r.count} ${isGroup ? "thành viên" : "khóa học"}.` : "Không thể hoàn tác."}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true, disabled: r.count > 0 }}
                  onConfirm={async () => {
                    if (report(message, await remove(r.id))) router.refresh();
                  }}
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
                </Popconfirm>
              </Flex>
            ),
          },
        ]}
      />
      <FootNote>{isGroup ? "Chỉ xóa được nhóm không còn thành viên. Tên nhóm không được trùng." : "Chỉ xóa được danh mục không còn khóa học nào dùng. Tên danh mục không được trùng."}</FootNote>
      <Modal
        open={editing !== null}
        title={editing === "new" ? `Tạo ${noun}` : `Đổi tên ${noun}`}
        okText={editing === "new" ? "Tạo" : "Lưu"}
        cancelText="Hủy"
        confirmLoading={busy}
        okButtonProps={{ disabled: !name.trim() }}
        onOk={submit}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onPressEnter={() => name.trim() && submit()} placeholder={`Tên ${noun}`} />
      </Modal>
    </>
  );
}
