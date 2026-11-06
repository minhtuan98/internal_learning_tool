"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Col, Flex, Form, Input, Modal, Row, Segmented, Select, Table, Tabs, Tag, Tooltip, Typography } from "antd";
import { ClearOutlined, EyeOutlined, FileSearchOutlined, SettingOutlined, WarningOutlined } from "@ant-design/icons";
import Certificate, { type CertificateData } from "@/components/Certificate";
import { formatRecipientName, NAME_FORMATS } from "@/lib/cert-name";
import { BarList, CountUp, FootNote, KpiCard, PageHeader, report } from "@/components/ui";
import { fmtDate, pct } from "@/lib/format";
import type { CertificateSettings } from "@/lib/certificates";
import { updateCertificateSettings } from "@/server/certificate-actions";

const { Text } = Typography;

type Cert = CertificateData & { id: string; userId: string; courseId: string };
type Member = { id: string; name: string; fullName: string | null; email: string; groupId: string | null; group: string | null; status: string };
type Course = { id: string; title: string; reach: string[] };

export default function CertificatesAdminClient({ certs, members, courses, groups, settings }: { certs: Cert[]; members: Member[]; courses: Course[]; groups: { id: string; name: string }[]; settings: CertificateSettings }) {
  const [course, setCourse] = useState<string | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("members");
  const [editing, setEditing] = useState(false);
  const [previewing, setPreviewing] = useState<(Member & { certs: Cert[] }) | null>(null);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const inGroup = (userId: string) => !group || memberById.get(userId)?.groupId === group;
  const shownCerts = certs.filter((c) => (!course || c.courseId === course) && inGroup(c.userId));
  const term = q.trim().toLowerCase();
  const shownMembers = members.filter((m) => (!group || m.groupId === group) && (!term || m.name.toLowerCase().includes(term) || m.email.toLowerCase().includes(term)));

  const byMember = new Map<string, Cert[]>();
  for (const c of shownCerts) (byMember.get(c.userId) ?? byMember.set(c.userId, []).get(c.userId)!).push(c);
  const memberRows = shownMembers
    .map((m) => ({ ...m, certs: byMember.get(m.id) ?? [] }))
    .sort((a, b) => b.certs.length - a.certs.length || a.name.localeCompare(b.name, "vi"));
  const holders = memberRows.filter((m) => m.certs.length > 0).length;
  const since = Date.now() - 30 * 86_400_000;
  const recent = shownCerts.filter((c) => new Date(c.completedAt).getTime() >= since).length;

  const courseRows = courses
    .filter((c) => !course || c.id === course)
    .map((c) => {
      const reach = c.reach.filter((u) => inGroup(u)).length;
      const got = shownCerts.filter((x) => x.courseId === c.id).length;
      return { label: c.title, value: pct(got, reach), hint: `${got} / ${reach} người` };
    })
    .sort((a, b) => b.value - a.value);

  const filtered = course || group || term;
  const certRows = shownCerts.filter((c) => !term || c.recipientName.toLowerCase().includes(term) || c.number.toLowerCase().includes(term) || memberById.get(c.userId)?.email.toLowerCase().includes(term));

  return (
    <>
      <PageHeader
        crumbs={[{ title: "Không gian học tập" }, { title: "Chứng chỉ" }]}
        title="Chứng chỉ"
        description="Chứng chỉ được cấp tự động khi thành viên học hết bài và đạt mọi quiz của khóa học."
        extra={<Button icon={<SettingOutlined />} onClick={() => setEditing(true)}>Cài đặt chứng chỉ</Button>}
      />

      <Flex gap={12} style={{ marginBottom: 16 }}>
        <Select allowClear placeholder="Tất cả khóa học" style={{ width: 260 }} value={course} onChange={(v) => setCourse(v ?? null)} options={courses.map((c) => ({ value: c.id, label: c.title }))} />
        <Select allowClear placeholder="Tất cả nhóm" style={{ width: 180 }} value={group} onChange={(v) => setGroup(v ?? null)} options={groups.map((g) => ({ value: g.id, label: g.name }))} />
        <Input.Search allowClear placeholder="Tìm thành viên, email, số chứng chỉ" style={{ width: 300 }} value={q} onChange={(e) => setQ(e.target.value)} />
        {filtered && <Button icon={<ClearOutlined />} onClick={() => { setCourse(null); setGroup(null); setQ(""); }}>Xóa bộ lọc</Button>}
      </Flex>

      <Row gutter={16} style={{ marginBottom: 16 }} className="lh-stagger">
        <Col span={6}><KpiCard label="Chứng chỉ đã cấp" value={shownCerts.length} /></Col>
        <Col span={6}><KpiCard label="Thành viên có chứng chỉ" value={pct(holders, shownMembers.length)} suffix="%" hint={`${holders} / ${shownMembers.length} thành viên`} /></Col>
        <Col span={6}><KpiCard label="Cấp trong 30 ngày qua" value={recent} /></Col>
        <Col span={6}><KpiCard label="Trung bình mỗi thành viên" value={shownMembers.length ? Math.round((shownCerts.length / shownMembers.length) * 10) / 10 : 0} hint="chứng chỉ" /></Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card styles={{ body: { paddingTop: 4 } }}>
            <Tabs
              activeKey={tab}
              onChange={setTab}
              items={[
                {
                  key: "members",
                  label: `Theo thành viên · ${memberRows.length}`,
                  children: (
                    <Table
                      rowKey="id"
                      size="middle"
                      dataSource={memberRows}
                      pagination={{ pageSize: 10, hideOnSinglePage: true }}
                      expandable={{
                        rowExpandable: (r) => r.certs.length > 0,
                        expandedRowRender: (r) => (
                          <Flex vertical gap={6}>
                            {r.certs.map((c) => (
                              <Flex key={c.id} justify="space-between" align="center">
                                <Text>{c.courseTitle} <Text type="secondary">· Số {c.number} · {fmtDate(c.completedAt)}</Text></Text>
                                <Link href={`/certificates/${c.id}`}><Button size="small" icon={<EyeOutlined />}>Xem</Button></Link>
                              </Flex>
                            ))}
                          </Flex>
                        ),
                      }}
                      columns={[
                        {
                          title: "Thành viên / Nhóm",
                          render: (_, r) => (
                            <div>
                              <Text strong>{r.name}</Text> {r.status === "LOCKED" && <Tag>Đã khóa</Tag>}
                              <div><Text type="secondary" style={{ fontSize: 12 }}>{r.email}{r.group ? ` · ${r.group}` : ""}</Text></div>
                            </div>
                          ),
                        },
                        { title: "Chứng chỉ", width: 110, align: "right", sorter: (a, b) => a.certs.length - b.certs.length, render: (_, r) => <Text strong style={{ fontSize: 16 }}><CountUp value={r.certs.length} /></Text> },
                        {
                          title: "Khóa học",
                          render: (_, r) =>
                            r.certs.length ? (
                              <Flex gap={4} wrap>{r.certs.slice(0, 3).map((c) => <Tag key={c.id} color="cyan">{c.courseTitle}</Tag>)}{r.certs.length > 3 && <Tag>+{r.certs.length - 3}</Tag>}</Flex>
                            ) : (
                              <Text type="secondary">Chưa có</Text>
                            ),
                        },
                        { title: "Gần nhất", width: 110, render: (_, r) => (r.certs[0] ? fmtDate(r.certs.reduce((a, b) => (new Date(a.completedAt) > new Date(b.completedAt) ? a : b)).completedAt) : "—") },
                        {
                          title: "",
                          width: 120,
                          render: (_, r) => (
                            <Flex gap={6} align="center" justify="flex-end">
                              {!r.fullName && (
                                <Tooltip title="Thành viên chưa có họ tên, chứng chỉ sẽ dùng tên tài khoản email.">
                                  <WarningOutlined style={{ color: "var(--ant-color-warning)" }} />
                                </Tooltip>
                              )}
                              <Button size="small" icon={<FileSearchOutlined />} onClick={() => setPreviewing(r)}>Xem trước</Button>
                            </Flex>
                          ),
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: "all",
                  label: `Tất cả chứng chỉ · ${certRows.length}`,
                  children: (
                    <Table
                      rowKey="id"
                      size="middle"
                      dataSource={certRows}
                      pagination={{ pageSize: 10, hideOnSinglePage: true }}
                      columns={[
                        { title: "Số chứng chỉ", dataIndex: "number", width: 170 },
                        { title: "Thành viên", render: (_, c) => <><Text strong>{c.recipientName}</Text><div><Text type="secondary" style={{ fontSize: 12 }}>{memberById.get(c.userId)?.group ?? ""}</Text></div></> },
                        { title: "Khóa học", dataIndex: "courseTitle" },
                        { title: "Hoàn thành", width: 120, render: (_, c) => fmtDate(c.completedAt), sorter: (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(), defaultSortOrder: "descend" },
                        { title: "", width: 80, render: (_, c) => <Link href={`/certificates/${c.id}`}><Button size="small" icon={<EyeOutlined />}>Xem</Button></Link> },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Tỷ lệ nhận chứng chỉ theo khóa học">
            <BarList rows={courseRows} />
          </Card>
        </Col>
      </Row>
      <FootNote>Chứng chỉ đã cấp giữ nguyên nội dung (tên, khóa học, người ký) kể cả khi dữ liệu thay đổi sau này.</FootNote>

      <SettingsModal open={editing} onClose={() => setEditing(false)} settings={settings} />
      <MemberPreview member={previewing} settings={settings} onClose={() => setPreviewing(null)} />
    </>
  );
}

/** Signer + seal text, with a live preview of the certificate. Applies to certificates issued from now on. */
function SettingsModal({ open, onClose, settings }: { open: boolean; onClose: () => void; settings: CertificateSettings }) {
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm<CertificateSettings>();
  const values = Form.useWatch([], form) ?? settings;
  const [saving, startSaving] = useTransition();
  const preview = { ...settings, ...values };
  const save = (v: CertificateSettings) =>
    startSaving(async () => {
      if (report(message, await updateCertificateSettings(v))) {
        onClose();
        router.refresh();
      }
    });
  return (
    <Modal open={open} onCancel={onClose} title="Cài đặt chứng chỉ" width={980} okText="Lưu" cancelText="Hủy" confirmLoading={saving} onOk={() => form.submit()} destroyOnHidden>
      <Row gutter={24}>
        <Col span={10}>
          <Form form={form} layout="vertical" initialValues={settings} onFinish={save} requiredMark={false}>
            <Form.Item name="nameFormat" label="Định dạng tên người nhận" extra="Thành viên chưa có họ tên luôn dùng tên tài khoản email."><Select options={NAME_FORMATS} /></Form.Item>
            <Form.Item name="signerName" label="Người ký" rules={[{ required: true, max: 60 }]}><Input /></Form.Item>
            <Form.Item name="signerTitle" label="Chức danh người ký" rules={[{ required: true, max: 80 }]}><Input /></Form.Item>
            <Form.Item name="sealCode" label="Mã chứng chỉ (dấu + số chứng chỉ)" extra="Số chứng chỉ: <thứ tự>/GCN-<mã>.<năm>" rules={[{ required: true, pattern: /^[A-Za-z0-9-]{1,10}$/, message: "Chữ, số hoặc dấu gạch, tối đa 10 ký tự" }]}><Input /></Form.Item>
            <Form.Item name="sealLabel" label="Dòng chữ giữa con dấu" rules={[{ required: true, max: 40 }]}><Input /></Form.Item>
            <Form.Item name="sealRing" label="Dòng chữ vòng quanh con dấu" rules={[{ required: true, max: 80 }]}><Input /></Form.Item>
          </Form>
          <Text type="secondary" style={{ fontSize: 12 }}>Chỉ áp dụng cho chứng chỉ cấp từ bây giờ. Chứng chỉ đã cấp giữ nguyên.</Text>
        </Col>
        <Col span={14}>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>Xem trước</Text>
          <div className="lh-cert-thumb">
            <Certificate
              data={{
                number: `1/GCN-${(preview.sealCode || "IMS").toUpperCase()}.${new Date().getFullYear()}`,
                recipientName: formatRecipientName({ fullName: "Nguyễn Văn An", email: "an.nguyen@saigontechnology.com" }, preview.nameFormat ?? "FULL"),
                courseTitle: "Tên khóa học",
                completedAt: new Date(),
                signerName: preview.signerName,
                signerTitle: preview.signerTitle,
                sealCode: (preview.sealCode || "").toUpperCase(),
                sealLabel: (preview.sealLabel || "").toUpperCase(),
                sealRing: preview.sealRing,
              }}
            />
          </div>
        </Col>
      </Row>
    </Modal>
  );
}

/**
 * Admin check of what a member's certificate looks like: issued certificates exactly as issued,
 * plus a preview with the current settings (name format, signer) for courses not finished yet.
 */
function MemberPreview({ member, settings, onClose }: { member: (Member & { certs: Cert[] }) | null; settings: CertificateSettings; onClose: () => void }) {
  const [pick, setPick] = useState<string>("preview");
  const name = member ? formatRecipientName(member, settings.nameFormat) : "";
  const issued = member?.certs ?? [];
  const current = issued.find((c) => c.id === pick);
  const data: CertificateData | null = !member
    ? null
    : current ?? {
        number: `…/GCN-${settings.sealCode}.${new Date().getFullYear()}`,
        recipientName: name,
        courseTitle: "Tên khóa học",
        completedAt: new Date(),
        signerName: settings.signerName,
        signerTitle: settings.signerTitle,
        sealCode: settings.sealCode,
        sealLabel: settings.sealLabel,
        sealRing: settings.sealRing,
      };
  return (
    <Modal
      open={!!member}
      onCancel={() => { setPick("preview"); onClose(); }}
      footer={current ? <Link href={`/certificates/${current.id}`}><Button type="primary" icon={<EyeOutlined />}>Mở chứng chỉ (in, sửa tên)</Button></Link> : null}
      title={member ? `Chứng chỉ của ${member.name}` : ""}
      width={980}
      destroyOnHidden
    >
      {member && data && (
        <Flex vertical gap={12}>
          <Segmented
            value={pick}
            onChange={(v) => setPick(String(v))}
            options={[{ value: "preview", label: "Xem trước (cài đặt hiện tại)" }, ...issued.map((c) => ({ value: c.id, label: `${c.courseTitle} · ${c.number}` }))]}
          />
          {!member.fullName && <Alert type="warning" showIcon title="Thành viên chưa có họ tên." description="Chứng chỉ đang dùng tên tài khoản email. Cập nhật họ tên ở trang Người dùng, hoặc sửa tên trên từng chứng chỉ đã cấp." />}
          {current && current.recipientName !== name && (
            <Alert type="info" showIcon title={`Tên trên chứng chỉ này: “${current.recipientName}”. Theo cài đặt hiện tại sẽ là: “${name}”.`} description="Chứng chỉ đã cấp giữ nguyên tên lúc cấp. Mở chứng chỉ để sửa tên nếu cần." />
          )}
          <div className="lh-cert-thumb"><Certificate data={data} /></div>
          <Text type="secondary" style={{ fontSize: 12 }}>Họ tên trong hệ thống: {member.fullName ?? "—"} · Email: {member.email}</Text>
        </Flex>
      )}
    </Modal>
  );
}
