"use client";

/**
 * Welcome screen (DESIGN_SYSTEM.md → Screens → Welcome). Shown after each sign-in; the checkbox stores
 * lh_skip_welcome=1 so sign-in goes straight to the role home. Reachable again from the user menu.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Checkbox, Col, Flex, Row, Tag, Typography } from "antd";
import { ArrowRightOutlined, BookOutlined } from "@ant-design/icons";
import ParticleLogo, { type ParticleStep } from "@/components/ParticleLogo";
import { ThemeToggle, type ShellUser } from "@/components/Shells";
import { CountUp } from "@/components/ui";
import { useThemeMode } from "@/components/Providers";
import { BRAND } from "@/lib/brand";

const { Title, Text, Paragraph } = Typography;

export type WelcomeStat = { label: string; value: number; suffix?: string; tone?: "danger"; href?: string };

const STEPS: ParticleStep[] = [{ kind: "sphere" }, { kind: "mark" }, { kind: "text", text: "SAIGON TECHNOLOGY" }, { kind: "text", text: "LEARNING HUB" }];

function firstName(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1] || full;
}

export default function WelcomeClient({ user, home, stats, next, skip }: { user: ShellUser; home: string; stats: WelcomeStat[]; next: { label: string; href: string } | null; skip: boolean }) {
  const router = useRouter();
  const { mode } = useThemeMode();
  const [dontShow, setDontShow] = useState(skip);
  const admin = user.role === "ADMIN";

  useEffect(() => {
    document.cookie = dontShow ? "lh_skip_welcome=1; path=/; max-age=31536000; samesite=lax" : "lh_skip_welcome=; path=/; max-age=0; samesite=lax";
  }, [dontShow]);

  // Enter = continue (keyboard shortcut for the single primary action)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !(e.target instanceof HTMLInputElement)) router.push(home);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [home, router]);

  return (
    <div className="lh-welcome">
      <Flex justify="space-between" align="center" style={{ padding: "16px 32px" }}>
        <Text type="secondary" style={{ letterSpacing: 0.4 }}>
          {BRAND.company} · Learning Hub
        </Text>
        <ThemeToggle />
      </Flex>

      <Flex vertical align="center" className="lh-page" style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 48px", textAlign: "center" }}>
        <ParticleLogo width={820} height={260} steps={STEPS} count={2200} dot={1.6} repel={90} hold={2800} transition={1500} ink={mode === "dark" ? "#F2F8FB" : "#102030"} />

        <Tag variant="filled" color="cyan" style={{ borderRadius: 999, marginInlineEnd: 0, marginTop: 8 }}>✦ {BRAND.tagline}</Tag>
        <Title level={1} style={{ margin: "12px 0 4px", fontWeight: 600, fontSize: 40 }}>
          <span className="lh-gradient-text">Chào {firstName(user.name)}, chào mừng đến Learning Hub</span>
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 16, maxWidth: 620, marginBottom: 24 }}>
          {admin
            ? `Nơi đội ngũ ${BRAND.company} soạn khóa học, giao bài theo nhóm và theo dõi kết quả học tập.`
            : `Nơi bạn học các khóa được giao, làm quiz và theo dõi tiến độ của mình tại ${BRAND.company}.`}
        </Paragraph>

        <Row gutter={[12, 12]} className="lh-stagger" style={{ width: "100%", marginBottom: 24 }}>
          {stats.map((s) => {
            const card = (
              <Card className={`lh-kpi${s.href ? " lh-clickable" : ""}`} styles={{ body: { padding: "16px 18px", textAlign: "left" } }} style={{ height: "100%" }}>
                <Text type="secondary" style={{ fontSize: 13 }}>{s.label}</Text>
                <div className="lh-display" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.25, color: s.tone === "danger" ? "var(--ant-color-error)" : undefined }}>
                  <CountUp value={s.value} />
                  {s.suffix && <span style={{ fontSize: 18, marginLeft: 2 }}>{s.suffix}</span>}
                </div>
              </Card>
            );
            return (
              <Col span={24 / stats.length} key={s.label}>
                {s.href ? <Link href={s.href}>{card}</Link> : card}
              </Col>
            );
          })}
        </Row>

        <Flex gap={12} align="center" wrap justify="center">
          <Button type="primary" size="large" icon={<ArrowRightOutlined />} iconPlacement="end" onClick={() => router.push(home)}>
            {admin ? "Vào trang Tổng quan" : "Vào Việc của tôi"}
          </Button>
          {next && (
            <Link href={next.href}>
              <Button size="large" icon={<BookOutlined />}>Học tiếp: {next.label}</Button>
            </Link>
          )}
        </Flex>
        <Text type="secondary" style={{ fontSize: 12, marginTop: 10 }}>Nhấn Enter để vào ngay.</Text>

        <Checkbox checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} style={{ marginTop: 20 }}>
          Không hiện màn này sau khi đăng nhập (mở lại từ menu tài khoản → Màn chào mừng)
        </Checkbox>
      </Flex>
    </div>
  );
}
