import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import { Button, Card, Col, Empty, Row, Skeleton, Space, Tag, Typography } from "antd";
import { erpKeys, getProject, listInvoices, listProjectBuildings, type InvoiceStatus, type ProjectStatus } from "@/lib/erp";
import { formatCurrency, formatCurrencyPair, formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";

function projectStatusColor(status: ProjectStatus) {
  if (status === "completed") {
    return "blue";
  }
  if (status === "paused") {
    return "orange";
  }
  return "green";
}

function invoiceStatusColor(status: InvoiceStatus) {
  if (status === "paid") {
    return "green";
  }
  if (status === "partial") {
    return "orange";
  }
  return "red";
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { t } = useLang();

  const { data: project, isLoading } = useQuery({
    queryKey: erpKeys.project(projectId),
    queryFn: () => getProject(projectId),
    enabled: Number.isFinite(projectId),
  });

  const { data: invoices } = useQuery({
    queryKey: erpKeys.invoices,
    queryFn: listInvoices,
  });

  const { data: buildings } = useQuery({
    queryKey: erpKeys.projectBuildings(projectId),
    queryFn: () => listProjectBuildings(projectId),
    enabled: Number.isFinite(projectId),
  });

  const relatedInvoices = invoices?.filter((invoice) => invoice.projectId === projectId) ?? [];
  const globalInvoices = relatedInvoices.filter((invoice) => invoice.buildingId == null);

  if (isLoading || !project) {
    return isLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : <Empty description={t.notFound} />;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Row align="middle" gutter={[16, 16]}>
        <Col flex="none">
          <Link href="/projects">
            <Button icon={<ArrowLeft size={16} />} />
          </Link>
        </Col>
        <Col flex="auto">
          <Space size="small" wrap>
            <Typography.Title level={2} style={{ margin: 0 }}>
              {project.name}
            </Typography.Title>
            <Tag color={projectStatusColor(project.status)}>{t[project.status]}</Tag>
          </Space>
          <div>
            <Typography.Text type="secondary">{project.client ?? t.noClient}</Typography.Text>
          </div>
        </Col>
      </Row>

      <Card title={t.projectInfo}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Typography.Text type="secondary">{t.location}</Typography.Text>
            <div><Typography.Text strong>{project.location ?? "-"}</Typography.Text></div>
          </Col>
          <Col xs={24} md={12}>
            <Typography.Text type="secondary">{t.budget}</Typography.Text>
            <div><Typography.Text strong>{project.budget != null ? formatCurrency(project.budget) : "-"}</Typography.Text></div>
          </Col>
          <Col xs={24} md={12}>
            <Typography.Text type="secondary">{t.startDate}</Typography.Text>
            <div><Typography.Text strong>{formatDate(project.startDate)}</Typography.Text></div>
          </Col>
          <Col xs={24} md={12}>
            <Typography.Text type="secondary">{t.endDate}</Typography.Text>
            <div><Typography.Text strong>{formatDate(project.endDate)}</Typography.Text></div>
          </Col>
          <Col xs={24} md={12}>
            <Typography.Text type="secondary">{t.buildingsTitle}</Typography.Text>
            <div><Typography.Text strong>{t.building_count(buildings?.length ?? 0)}</Typography.Text></div>
          </Col>
        </Row>
      </Card>

      <Card title={t.buildingsTitle}>
        {!buildings?.length ? (
          <Empty description={t.noBuildings} />
        ) : (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {buildings.map((building) => {
              const buildingInvoices = relatedInvoices.filter((invoice) => invoice.buildingId === building.id);
              const totalUsd = buildingInvoices.reduce((sum, invoice) => sum + invoice.totalAmountUsd, 0);
              const totalIqd = buildingInvoices.reduce((sum, invoice) => sum + invoice.totalAmountIqd, 0);

              return (
                <Card key={building.id} size="small">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <Typography.Text strong>{building.name}</Typography.Text>
                      <div>
                        <Typography.Text type="secondary">{t.relatedInvoices_count(buildingInvoices.length)}</Typography.Text>
                      </div>
                    </div>
                    <Typography.Text strong>{formatCurrencyPair({ usd: totalUsd, iqd: totalIqd })}</Typography.Text>
                  </div>
                </Card>
              );
            })}
          </Space>
        )}
      </Card>

      <Card
        title={
          <Space>
            <FileText size={16} />
            <span>{t.expense_count(relatedInvoices.length)}</span>
          </Space>
        }
      >
        {!relatedInvoices.length ? (
          <Empty description={t.noInvoicesForProject} />
        ) : (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {globalInvoices.length ? <Typography.Text type="secondary">{t.projectGlobalCost}</Typography.Text> : null}
            {relatedInvoices.map((invoice) => (
              <Link href={`/expenses/${invoice.id}`} key={invoice.id}>
                <div style={{ cursor: "pointer", borderRadius: 8, border: "1px solid #e5e0d5", padding: "10px 12px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <Typography.Text strong ellipsis>{invoice.number}</Typography.Text>
                      <div>
                        <Typography.Text type="secondary">
                          {[invoice.supplierName ?? t.noSupplier, invoice.buildingName ?? t.projectGlobalCost, formatDate(invoice.invoiceDate)]
                            .filter(Boolean)
                            .join(" | ")}
                        </Typography.Text>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Typography.Text strong>
                        {formatCurrencyPair({ usd: invoice.totalAmountUsd, iqd: invoice.totalAmountIqd })}
                      </Typography.Text>
                      <div style={{ marginTop: 4 }}>
                        <Tag color={invoiceStatusColor(invoice.status)}>{t[invoice.status]}</Tag>
                        {invoice.recordStatus === "deleted" ? <Tag>{t.deleted}</Tag> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </Space>
        )}
      </Card>
    </Space>
  );
}
