"use client";

/**
 * Shared design-system components (Ant Design based). Each maps to a Figma component:
 * PageHeader, KpiCard, CountUp, StatusTag family, FootNote, BarList, StackedBar, PageSkeleton.
 * Density / motion / loading rules: DESIGN_SYSTEM.md → "Density", "Motion", "Loading".
 */
import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Breadcrumb, Card, Col, Flex, Progress, Row, Skeleton, Statistic, Tag, Tooltip, Typography, theme, type StatisticProps } from "antd";
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

export type Crumb = { title: string; href?: string };

/**
 * Admin shell shows the Breadcrumb in the header (Figma "Top bar"), so PageHeader hands its crumbs
 * to the shell instead of rendering them inline. Member pages have no such slot → crumbs stay inline.
 */
const HeaderCrumbsContext = createContext<((c: Crumb[] | null) => void) | null>(null);

export function HeaderCrumbsProvider({ fallback, children }: { fallback: Crumb[]; children: (crumbs: Crumb[]) => ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[] | null>(null);
  return <HeaderCrumbsContext.Provider value={setCrumbs}>{children(crumbs ?? fallback)}</HeaderCrumbsContext.Provider>;
}

export function CrumbTrail({ crumbs, style }: { crumbs: Crumb[]; style?: React.CSSProperties }) {
  return (
    <Breadcrumb
      style={style}
      items={crumbs.map((c) => ({ title: c.href ? <Link href={c.href}>{c.title}</Link> : c.title }))}
    />
  );
}

export function PageHeader({
  crumbs,
  title,
  description,
  extra,
  meta,
}: {
  crumbs?: Crumb[];
  title: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
  meta?: ReactNode;
}) {
  const setHeaderCrumbs = useContext(HeaderCrumbsContext);
  const crumbKey = JSON.stringify(crumbs ?? null);
  useEffect(() => {
    if (!setHeaderCrumbs || !crumbs?.length) return;
    setHeaderCrumbs(crumbs);
    return () => setHeaderCrumbs(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeaderCrumbs, crumbKey]);
  const inlineCrumbs = !setHeaderCrumbs && crumbs && crumbs.length > 0;
  return (
    <div className="lh-page-header" style={{ marginBottom: 24 }}>
      {inlineCrumbs && <CrumbTrail crumbs={crumbs} style={{ marginBottom: 4 }} />}
      <Flex justify="space-between" align="flex-start" gap={16}>
        <div style={{ minWidth: 0 }}>
          <Title level={2} style={{ margin: 0, fontWeight: 600 }}>
            <span className="lh-gradient-text">{title}</span>
          </Title>
          {description && (
            <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
              {description}
            </Text>
          )}
          {meta && <div style={{ marginTop: 8 }}>{meta}</div>}
        </div>
        {extra && <Flex gap={8} style={{ flexShrink: 0 }}>{extra}</Flex>}
      </Flex>
    </div>
  );
}

/**
 * Count-up number for every stat figure (DESIGN_SYSTEM.md → Motion). Counts 0 → value when it first
 * scrolls into view and old → new when the value changes; static under prefers-reduced-motion.
 * Width is reserved for the final value and digits are tabular, so nothing around it shifts.
 */
export function CountUp({ value, duration = 800 }: { value: number; duration?: number }) {
  const decimals = Number.isInteger(value) ? 0 : Math.min(2, (String(value).split(".")[1] ?? "").length);
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    const start = from.current;
    if (!el || start === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = value;
      setShown(value);
      return;
    }
    let raf = 0;
    let t0 = 0;
    const tick = (t: number) => {
      t0 ||= t;
      const p = Math.min(1, (t - t0) / duration);
      const v = start + (value - start) * (1 - Math.pow(1 - p, 3)); // ease-out cubic
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  const final = fmt(value);
  const digits = final.replace(/[^0-9]/g, "").length;
  return (
    <span ref={ref} className="lh-countup" style={{ minWidth: `calc(${digits}ch + ${(final.length - digits) * 0.35}ch)` }}>
      <span aria-hidden="true">{fmt(shown)}</span>
      <span className="lh-sr-only">{final}</span>
    </span>
  );
}

/** antd Statistic formatter: numbers count up, strings ("—") render as-is. */
export const countUpFormatter: StatisticProps["formatter"] = (v) => (typeof v === "number" ? <CountUp value={v} /> : v);

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
    <Card loading={loading} className={href ? "lh-kpi lh-clickable" : "lh-kpi"} style={{ height: "100%" }}>
      <Flex align="center" gap={6} style={{ marginBottom: 4 }}>
        <Text type="secondary">{label}</Text>
        {definition && (
          <Tooltip title={definition}>
            <InfoCircleOutlined style={{ color: token.colorTextTertiary, fontSize: 12 }} />
          </Tooltip>
        )}
      </Flex>
      <Statistic value={value} suffix={suffix} formatter={countUpFormatter} styles={{ content: { color: danger ? token.colorError : token.colorText, fontWeight: 600 } }} />
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
    <Flex gap={8} align="center" style={{ marginTop: 16 }}>
      <SafetyOutlined style={{ opacity: 0.6 }} />
      <Text type="secondary" style={{ fontSize: 12 }}>{children}</Text>
    </Flex>
  );
}

/** Horizontal bar list built from antd Progress (Figma Chart/Bar). Animates on mount via Progress. */
export function BarList({ rows, suffix = "%" }: { rows: { label: string; value: number; hint?: string }[]; suffix?: string }) {
  if (rows.length === 0) return <Text type="secondary">Chưa có dữ liệu.</Text>;
  return (
    <Flex vertical gap={10}>
      {rows.map((r) => (
        <div key={r.label}>
          <Flex justify="space-between">
            <Text>{r.label}</Text>
            <Text strong>
              <CountUp value={r.value} />
              {suffix} {r.hint && <Text type="secondary" style={{ fontWeight: 400 }}>· {r.hint}</Text>}
            </Text>
          </Flex>
          <Progress percent={Math.min(100, r.value)} showInfo={false} size={["100%", 8]} style={{ margin: 0 }} />
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
      <div className="lh-stacked" style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden" }}>
        {parts.map((p) => (
          <Tooltip key={p.label} title={`${p.label}: ${p.value}`}>
            <div style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
          </Tooltip>
        ))}
      </div>
      <Flex gap={16} wrap style={{ marginTop: 10 }}>
        {parts.map((p) => (
          <Flex key={p.label} gap={8} align="center">
            <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, display: "inline-block" }} />
            <Text>
              {p.label} <Text strong><CountUp value={Math.round((p.value / total) * 100)} />%</Text> <Text type="secondary">(<CountUp value={p.value} />)</Text>
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

/**
 * Route-level loading placeholder (Figma: 08 · Density · Motion · Loading → Skeleton patterns).
 * Used by every loading.tsx so navigation shows the shape of the target page (heuristic #1).
 */
export function PageSkeleton({ variant = "list" }: { variant?: "list" | "detail" | "cards" | "dashboard" }) {
  const header = (
    <div style={{ marginBottom: 16 }}>
      <Skeleton active title={{ width: 240 }} paragraph={{ rows: 1, width: 360 }} />
    </div>
  );
  const kpis = (n: number) => (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      {Array.from({ length: n }, (_, i) => (
        <Col span={24 / n} key={i}>
          <Card><Skeleton active title={false} paragraph={{ rows: 2, width: ["50%", "30%"] }} /></Card>
        </Col>
      ))}
    </Row>
  );
  const table = (
    <Card styles={{ body: { padding: 16 } }}>
      <Skeleton.Input active block style={{ height: 28, marginBottom: 12 }} />
      <Skeleton active title={false} paragraph={{ rows: 6, width: "100%" }} />
    </Card>
  );
  return (
    <div className="lh-skeleton" aria-busy="true" aria-label="Đang tải">
      {header}
      {variant === "list" && (<>{kpis(3)}{table}</>)}
      {variant === "dashboard" && (
        <>
          <Flex gap={12} style={{ marginBottom: 16 }}>
            {[200, 160, 240].map((w) => <Skeleton.Input key={w} active style={{ width: w }} />)}
          </Flex>
          {kpis(4)}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            {[0, 1].map((i) => (
              <Col span={12} key={i}><Card><Skeleton active paragraph={{ rows: 4 }} /></Card></Col>
            ))}
          </Row>
          {table}
        </>
      )}
      {variant === "detail" && (
        <>
          <Flex gap={24} style={{ marginBottom: 16 }}>
            {[80, 96, 72].map((w) => <Skeleton.Button key={w} active size="small" style={{ width: w }} />)}
          </Flex>
          <Row gutter={16}>
            <Col span={16}><Card><Skeleton active paragraph={{ rows: 8 }} /></Card></Col>
            <Col span={8}><Card><Skeleton active paragraph={{ rows: 4 }} /></Card></Col>
          </Row>
        </>
      )}
      {variant === "cards" && (
        <Flex vertical gap={12}>
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} styles={{ body: { padding: 16 } }}>
              <Flex gap={16} align="center">
                <Skeleton.Image active style={{ width: 96, height: 64 }} />
                <Skeleton active title={{ width: "40%" }} paragraph={{ rows: 1, width: "70%" }} style={{ flex: 1 }} />
                <Skeleton.Button active />
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
    </div>
  );
}
