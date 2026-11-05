"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Avatar, Button, Drawer, Dropdown, Flex, Form, Input, Radio, Select, Table, Tabs, Typography } from "antd";
import { EditOutlined, LockOutlined, MoreOutlined, UnlockOutlined, UserAddOutlined } from "@ant-design/icons";
import { FootNote, PageHeader, UserStatusTag, report } from "@/components/ui";
import { fmtShort, initials } from "@/lib/format";
import { savePerson, setUserStatus } from "@/server/people-actions";

type U = { id: string; email: string; fullName: string | null; role: string; status: string; jobTitle: string; employeeCode: string; groupId: string | null; group: string | null; lastSignInAt: Date | null; avatarUrl: string | null };

export default function UsersClient({ users, groups, meId }: { users: U[]; groups: { id: string; name: string }[]; meId: string }) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [tab, setTab] = useState("MEMBER");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState<U | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const role = Form.useWatch("role", form);

  const rows = useMemo(
    () =>
      users.filter(
        (u) =>
          u.role === tab &&
          (!group || u.groupId === group) &&
          (!status || u.status === status) &&
          (!q || `${u.fullName} ${u.email} ${u.employeeCode}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [users, tab, group, status, q],
  );

  const open = (u: U | "new") => {
    setEditing(u);
    form.resetFields();
    form.setFieldsValue(u === "new" ? { role: tab } : { ...u });
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    const r = await savePerson(editing === "new" ? null : (editing as U).id, v);
    setSaving(false);
    if (report(message, r)) {
      setEditing(null);
      router.refresh();
    }
  };

  const toggleLock = (u: U) => {
    const locking = u.status === "ACTIVE";
    modal.confirm({
      title: locking ? `Khóa tài khoản ${u.fullName ?? u.email}?` : `Mở khóa tài khoản ${u.fullName ?? u.email}?`,
      content: locking ? "Người này sẽ không đăng nhập được. Kết quả học tập vẫn được giữ trong báo cáo." : "Người này sẽ đăng nhập lại được.",
      okText: locking ? "Khóa tài khoản" : "Mở khóa",
      okButtonProps: { danger: locking },
      cancelText: "Hủy",
      onOk: async () => {
        if (report(message, await setUserStatus(u.id, locking ? "LOCKED" : "ACTIVE"))) router.refresh();
      },
    });
  };

  return (
    <>
      <PageHeader
        crumbs={[{ title: "Không gian học tập" }, { title: "Người dùng" }]}
        title="Người dùng"
        description={`${users.length} tài khoản. Chỉ người được thêm ở đây mới đăng nhập được.`}
        extra={<Button type="primary" icon={<UserAddOutlined />} onClick={() => open("new")}>Thêm người dùng</Button>}
      />
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: "MEMBER", label: `Thành viên · ${users.filter((u) => u.role === "MEMBER").length}` },
          { key: "ADMIN", label: `Quản trị viên · ${users.filter((u) => u.role === "ADMIN").length}` },
        ]}
      />
      <Flex gap={12} style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="Tìm theo tên, email, mã..." style={{ width: 320 }} onChange={(e) => setQ(e.target.value)} />
        {tab === "MEMBER" && <Select allowClear placeholder="Tất cả nhóm" style={{ width: 180 }} value={group} onChange={setGroup} options={groups.map((g) => ({ value: g.id, label: g.name }))} />}
        <Select allowClear placeholder="Tất cả trạng thái" style={{ width: 180 }} value={status} onChange={setStatus} options={[{ value: "ACTIVE", label: "Hoạt động" }, { value: "LOCKED", label: "Đã khóa" }]} />
      </Flex>
      <Table
        rowKey="id"
        dataSource={rows}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        columns={[
          {
            title: "Họ tên / Email",
            render: (_, u) => (
              <Flex gap={12} align="center">
                <Avatar src={u.avatarUrl ?? undefined}>{initials(u.fullName, u.email)}</Avatar>
                <div>
                  <Typography.Text strong>{u.fullName ?? "Chưa đăng nhập"}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{u.email}</Typography.Text>
                </div>
              </Flex>
            ),
          },
          { title: "Mã nhân viên", dataIndex: "employeeCode" },
          { title: "Chức danh", dataIndex: "jobTitle" },
          ...(tab === "MEMBER" ? [{ title: "Nhóm", dataIndex: "group" }] : []),
          { title: "Trạng thái", render: (_, u) => <UserStatusTag status={u.status} /> },
          { title: "Đăng nhập gần nhất", render: (_, u) => fmtShort(u.lastSignInAt) },
          {
            title: "",
            width: 56,
            render: (_, u) => (
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: [
                    { key: "edit", icon: <EditOutlined />, label: "Sửa thông tin", onClick: () => open(u) },
                    ...(u.id !== meId ? [{ key: "lock", icon: u.status === "ACTIVE" ? <LockOutlined /> : <UnlockOutlined />, label: u.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa", danger: u.status === "ACTIVE", onClick: () => toggleLock(u) }] : []),
                  ],
                }}
              >
                <Button type="text" icon={<MoreOutlined />} aria-label="Thao tác" />
              </Dropdown>
            ),
          },
        ]}
      />
      <FootNote>Tên hiển thị được lấy từ Google ở lần đăng nhập đầu tiên. Khóa tài khoản không xóa kết quả học tập.</FootNote>

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        size={520}
        title={editing === "new" ? "Thêm người dùng" : "Sửa thông tin người dùng"}
        destroyOnHidden
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setEditing(null)}>Hủy</Button>
            <Button type="primary" loading={saving} onClick={submit}>{editing === "new" ? "Thêm người dùng" : "Lưu thay đổi"}</Button>
          </Flex>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Radio.Group optionType="button" options={[{ value: "MEMBER", label: "Thành viên" }, { value: "ADMIN", label: "Quản trị viên" }]} />
          </Form.Item>
          <Form.Item name="email" label="Email Google" rules={[{ required: true, type: "email", message: "Nhập email hợp lệ." }]} extra="Người này đăng nhập bằng đúng tài khoản Google có email này.">
            <Input placeholder="ten@gmail.com" />
          </Form.Item>
          <Form.Item name="fullName" label="Họ tên" extra="Để trống: lấy tự động từ Google ở lần đăng nhập đầu tiên.">
            <Input />
          </Form.Item>
          <Flex gap={12}>
            <Form.Item name="employeeCode" label="Mã nhân viên" rules={[{ required: true, message: "Nhập mã nhân viên." }]} style={{ flex: 1 }}>
              <Input placeholder="AC0xx" />
            </Form.Item>
            <Form.Item name="jobTitle" label="Chức danh" rules={[{ required: true, message: "Nhập chức danh." }]} style={{ flex: 2 }}>
              <Input />
            </Form.Item>
          </Flex>
          {role === "MEMBER" && (
            <Form.Item name="groupId" label="Nhóm" rules={[{ required: true, message: "Thành viên phải thuộc một nhóm." }]} extra="Đổi nhóm sẽ đổi quyền truy cập theo nhóm ngay lập tức; quyền cấp riêng và kết quả cũ được giữ.">
              <Select placeholder="Chọn nhóm" options={groups.map((g) => ({ value: g.id, label: g.name }))} />
            </Form.Item>
          )}
        </Form>
      </Drawer>
    </>
  );
}
