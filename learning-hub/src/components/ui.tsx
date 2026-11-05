"use client";

/**
 * Shared design-system components (Ant Design based). Each maps to a Figma component:
 * PageHeader, KpiCard, StatusTag family, FootNote, BarList, StackedBar.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumb, Card, Flex, Statistic, Tag, Tooltip, Typography, theme } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LockOutlined,
  SafetyOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

/** Re-exported so server components can use them (no dotting into client modules on the server). */
export const Title = Typography.Title;
export const Text = Typography.Text;

export function PageHeader({
  crumbs,
  title,
  description,
  extra,
  meta,
}: {
  crumbs?: { title: string; href?: string }[];
  title: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      {crumbs && crumbs.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 8 }}
          items={crumbs.map((c) => ({ title: c.href ? <Link href={c.href}>{c.title}</Link> : c.title }))}
        />
      )}
      <Flex justify="space-between" align="flex-start" gap={24}>
        <div style={{ minWidth: 0 }}>
          <Title level={2} style={{ margin: 0, fontWeight: 500 }}>
            {title}
          </Title>
          {description && (
            <Text type="secondary" style={{ display: "block", marginTop: 6 }}>
              {description}
            </Text>
          )}
          {meta && <div style={{ marginTop: 10 }}>{meta}</div>}
        </div>
        {extra && <Flex gap={8} style={{ flexShrink: 0 }}>{extra}</Flex>}
      </Flex>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  suffix,
  hint,
  definition,
  href,
  danger,
  loading,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  hint?: ReactNode;
  definition?: string;
  href?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  const { token } = theme.useToken();
  const body = (
    <Card loading={loading} className={href ? "lh-clickable" : undefined} style={{ height: "100%" }}>
      <Flex align="center" gap={6} style={{ marginBottom: 4 }}>
        <Text type="secondary">{label}</Text>
        {definition && (
          <Tooltip title={definition}>
            <InfoCircleOutlined style={{ color: token.colorTextTertiary, fontSize: 12 }} />
          </Tooltip>
        )}
      </Flex>
      <Statistic value={value} suffix={suffix} styles={{ content: { color: danger ? token.colorError : token.colorText, fontWeight: 600 } }} />
      {hint && <Text type="secondary" style={{ fontSize: 12 }}>{hint}</Text>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function CourseStatusTag({ status }: { status: string }) {
  return status === "PUBLISHED" ? (
    <Tag color="success" icon={<CheckCircleOutlined />}>Đã xuất bản</Tag>
  ) : (
    <Tag color="warning" icon={<ClockCircleOutlined />}>Bản nháp</Tag>
  );
}

export function PassTag({ passed }: { passed: boolean | null | undefined }) {
  if (passed === null || passed === undefined) return <Text type="secondary">—</Text>;
  return passed ? (
    <Tag color="success" icon={<CheckCircleOutlined />}>Đạt</Tag>
  ) : (
    <Tag color="error" icon={<CloseCircleOutlined />}>Chưa đạt</Tag>
  );
}

export function UserStatusTag({ status }: { status: string }) {
  return status === "ACTIVE" ? <Tag color="success" icon={<CheckCircleOutlined />}>Hoạt động</Tag> : <Tag icon={<LockOutlined />}>Đã khóa</Tag>;
}

const ASSIGNMENT_STATE: Record<string, { color: string; label: string; icon: ReactNode }> = {
  NOT_STARTED: { color: "default", label: "Chưa bắt đầu", icon: <ClockCircleOutlined /> },
  IN_PROGRESS: { color: "processing", label: "Đang học", icon: <SyncOutlined /> },
  COMPLETED: { color: "success", label: "Hoàn thành", icon: <CheckCircleOutlined /> },
  OVERDUE: { color: "error", label: "Quá hạn", icon: <ExclamationCircleOutlined /> },
  NO_ACCESS: { color: "warning", label: "Chưa có quyền", icon: <LockOutlined /> },
};

export function AssignmentStateTag({ state }: { state: string }) {
  const s = ASSIGNMENT_STATE[state] ?? ASSIGNMENT_STATE.NOT_STARTED;
  return <Tag color={s.color} icon={s.icon}>{s.label}</Tag>;
}

/** Deadline tag: error when overdue, warning when 3 days or less remain (heuristic #1). */
export function DeadlineTag({ deadline, done }: { deadline: Date | string; done?: boolean }) {
  const d = dayjs(deadline);
  const label = `Hạn ${d.format("DD/MM/YYYY HH:mm")}`;
  if (done) return <Tag icon={<ClockCircleOutlined />}>{label}</Tag>;
  const hours = d.diff(dayjs(), "hour");
  if (hours < 0) return <Tag color="error" icon={<ExclamationCircleOutlined />}>Quá hạn · {d.format("DD/MM/YYYY HH:mm")}</Tag>;
  if (hours <= 72) return <Tag color="warning" icon={<ClockCircleOutlined />}>{label}</Tag>;
  return <Tag icon={<ClockCircleOutlined />}>{label}</Tag>;
}

export function FootNote({ children }: { children: ReactNode }) {
  return (
    <Flex gap={8} align="center" style={{ marginTop: 24 }}>
      <SafetyOutlined style={{ opacity: 0.6 }} />
      <Text type="secondary" style={{ fontSize: 12 }}>{children}</Text>
    </Flex>
  );
}

/** Horizontal bar chart (maps to @ant-design/charts Bar if richer charts are needed later). */
export function BarList({ rows, suffix = "%" }: { rows: { label: string; value: number; hint?: string }[]; suffix?: string }) {
  const { token } = theme.useToken();
  if (rows.length === 0) return <Text type="secondary">Chưa có dữ liệu.</Text>;
  return (
    <Flex vertical gap={14}>
      {rows.map((r) => (
        <div key={r.label}>
          <Flex justify="space-between" style={{ marginBottom: 6 }}>
            <Text>{r.label}</Text>
            <Text strong>
              {r.value}
              {suffix} {r.hint && <Text type="secondary" style={{ fontWeight: 400 }}>· {r.hint}</Text>}
            </Text>
          </Flex>
          <div style={{ height: 10, borderRadius: 6, background: token.colorFillSecondary }}>
            <div style={{ width: `${Math.min(100, r.value)}%`, height: "100%", borderRadius: 6, background: token.colorPrimary }} />
          </div>
        </div>
      ))}
    </Flex>
  );
}

export function StackedBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (total === 0) return <Text type="secondary">Chưa có câu hỏi nào được duyệt.</Text>;
  return (
    <div>
      <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden" }}>
        {parts.map((p) => (
          <Tooltip key={p.label} title={`${p.label}: ${p.value}`}>
            <div style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
          </Tooltip>
        ))}
      </div>
      <Flex gap={20} wrap style={{ marginTop: 12 }}>
        {parts.map((p) => (
          <Flex key={p.label} gap={8} align="center">
            <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, display: "inline-block" }} />
            <Text>
              {p.label} <Text strong>{Math.round((p.value / total) * 100)}%</Text> <Text type="secondary">({p.value})</Text>
            </Text>
          </Flex>
        ))}
      </Flex>
    </div>
  );
}

/** Shows a server action error / success with antd message (heuristic #1, #9). */
export type MessageApi = { success: (c: string) => unknown; error: (c: string) => unknown };
export function report(message: MessageApi, r: { ok: boolean; error?: string; message?: string }, okText?: string) {
  if (r.ok) {
    if (okText || r.message) message.success(r.message ?? okText!);
    return true;
  }
  message.error(r.error ?? "Có lỗi xảy ra.");
  return false;
}
