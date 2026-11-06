"use client";

import Link from "next/link";
import { Button, Card, Col, Empty, Flex, Row, Typography } from "antd";
import { EyeOutlined, TrophyOutlined } from "@ant-design/icons";
import Certificate, { type CertificateData } from "@/components/Certificate";
import { KpiCard, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";

const { Text } = Typography;

type Cert = CertificateData & { id: string; issuedAt: Date | string };

export default function MyCertificatesClient({ certs }: { certs: Cert[] }) {
  const thisYear = new Date().getFullYear();
  return (
    <div className="lh-page">
      <PageHeader title="Chứng chỉ của tôi" description="Chứng chỉ được cấp tự động khi bạn học hết bài và đạt mọi quiz của một khóa học." />
      <Row gutter={16} style={{ marginBottom: 16 }} className="lh-stagger">
        <Col span={12}><KpiCard label="Chứng chỉ đã nhận" value={certs.length} /></Col>
        <Col span={12}><KpiCard label={`Nhận trong năm ${thisYear}`} value={certs.filter((c) => new Date(c.completedAt).getFullYear() === thisYear).length} /></Col>
      </Row>
      {certs.length === 0 ? (
        <Card>
          <Empty
            image={<TrophyOutlined style={{ fontSize: 48, color: "var(--ant-color-primary)" }} />}
            description={
              <>
                Bạn chưa có chứng chỉ nào.
                <br />
                <Text type="secondary">Hoàn thành một khóa học để nhận chứng chỉ đầu tiên.</Text>
              </>
            }
          >
            <Link href="/learn/courses"><Button type="primary">Xem khóa học của tôi</Button></Link>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {certs.map((c) => (
            <Col span={8} key={c.id}>
              <Card hoverable className="lh-clickable" styles={{ body: { padding: 14 } }} style={{ height: "100%" }}>
                <Link href={`/certificates/${c.id}`} aria-label={`Xem chứng chỉ ${c.courseTitle}`}>
                  <div className="lh-cert-thumb"><Certificate data={c} /></div>
                </Link>
                <Flex justify="space-between" align="flex-start" gap={8} style={{ marginTop: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <Text strong ellipsis style={{ display: "block" }}>{c.courseTitle}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>Hoàn thành {fmtDate(c.completedAt)} · Số {c.number}</Text>
                  </div>
                  <Link href={`/certificates/${c.id}`}><Button size="small" icon={<EyeOutlined />}>Xem</Button></Link>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
