import type { ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, FolderKanban, Truck, Users } from "lucide-react";
import { Card, Col, Empty, Progress, Row, Skeleton, Space, Tag, Typography } from "antd";
import { erpKeys, getDashboardOverview, type InvoiceStatus, type ProjectStatus } from "@/lib/erp";
import { formatCurrencyLabel, formatCurrencyPair } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";

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

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: ElementType;
  color: string;
}) {
  return (
    <Card size="small">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <Typography.Text type="secondary">{label}</Typography.Text>
          <Typography.Title level={2} style={{ margin: "8px 0 0" }}>
            {value}
          </Typography.Title>
        </div>
        <div style={{ color }}>
          <Icon size={24} />
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { t } = useLang();
  const { selectedProjectId } = useProjectScope();
  const { data, isLoading } = useQuery({
    queryKey: [...erpKeys.dashboard, selectedProjectId],
    queryFn: () => getDashboardOverview(selectedProjectId),
  });

  if (isLoading || !data) {
    return (
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            {t.dashboardTitle}
          </Typography.Title>
          <Typography.Text type="secondary">{t.dashboardSub}</Typography.Text>
        </div>
        <Row gutter={[16, 16]}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Col key={index} xs={24} md={12} xl={6}>
              <Card>
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </Space>
    );
  }

  const paymentPercentUsd =
    data.totalInvoiceAmountUsd > 0 ? Math.round((data.totalPaidAmountUsd / data.totalInvoiceAmountUsd) * 100) : 0;
  const paymentPercentIqd =
    data.totalInvoiceAmountIqd > 0 ? Math.round((data.totalPaidAmountIqd / data.totalInvoiceAmountIqd) * 100) : 0;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          {t.dashboardTitle}
        </Typography.Title>
        <Typography.Text type="secondary">{t.dashboardSub}</Typography.Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <StatCard label={t.totalWorkers} value={data.totalWorkers} icon={Users} color="#b45309" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatCard label={t.activeProjects} value={data.activeProjects} icon={FolderKanban} color="#0369a1" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatCard label={t.totalSuppliers} value={data.totalSuppliers} icon={Truck} color="#047857" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatCard label={t.unpaidInvoices} value={data.invoicesUnpaid} icon={AlertTriangle} color="#be123c" />
        </Col>
      </Row>

      <Card title={t.financialSummary} extra={<Typography.Text type="secondary">{t.paymentProgress}</Typography.Text>}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card size="small">
              <Typography.Text type="secondary">{t.totalInvoiced}</Typography.Text>
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                {formatCurrencyPair({ usd: data.totalInvoiceAmountUsd, iqd: data.totalInvoiceAmountIqd })}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small">
              <Typography.Text type="success">{t.amountPaid}</Typography.Text>
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                {formatCurrencyPair({ usd: data.totalPaidAmountUsd, iqd: data.totalPaidAmountIqd })}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small">
              <Typography.Text type="warning">{t.remaining}</Typography.Text>
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                {formatCurrencyPair({ usd: data.remainingAmountUsd, iqd: data.remainingAmountIqd })}
              </Typography.Title>
            </Card>
          </Col>
        </Row>
        <Space direction="vertical" size="small" style={{ width: "100%", marginTop: 20 }}>
          <Progress percent={paymentPercentUsd} format={(percent) => `${formatCurrencyLabel("USD")} ${percent}%`} />
          <Progress percent={paymentPercentIqd} format={(percent) => `IQD ${percent}%`} />
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card title={t.projectsSummary}>
            {data.projectsSummary.length === 0 ? (
              <Empty description={t.noneYet} />
            ) : (
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {data.projectsSummary.slice(0, 6).map((project) => (
                  <Link href={`/projects/${project.id}`} key={project.id}>
                    <div style={{ cursor: "pointer", borderRadius: 8, border: "1px solid #e5e0d5", padding: "10px 12px", transition: "background 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <Typography.Text strong ellipsis>
                            {project.name}
                          </Typography.Text>
                          <div style={{ marginTop: 6 }}>
                            <Tag color={projectStatusColor(project.status)}>{t[project.status]}</Tag>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <Typography.Text strong>
                            {formatCurrencyPair({ usd: project.totalInvoicedUsd, iqd: project.totalInvoicedIqd })}
                          </Typography.Text>
                          <div>
                            <Typography.Text type="secondary">{project.invoiceCount} invoices</Typography.Text>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </Space>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card title={t.workersSummary}>
            {data.workersSummary.length === 0 ? (
              <Empty description={t.noneYet} />
            ) : (
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {data.workersSummary.slice(0, 6).map((worker) => (
                  <Link href={`/workers/${worker.id}`} key={worker.id}>
                    <div style={{ cursor: "pointer", borderRadius: 8, border: "1px solid #e5e0d5", padding: "10px 12px", transition: "background 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <Typography.Text strong ellipsis>
                            {worker.name}
                          </Typography.Text>
                          <div>
                            <Typography.Text type="secondary">{worker.role}</Typography.Text>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <Typography.Text
                            strong
                            type={worker.balanceUsd >= 0 && worker.balanceIqd >= 0 ? "success" : "danger"}
                          >
                            {formatCurrencyPair({ usd: worker.balanceUsd, iqd: worker.balanceIqd })}
                          </Typography.Text>
                          <div>
                            <Typography.Text type="secondary">
                              {formatCurrencyPair({ usd: worker.totalCreditUsd, iqd: worker.totalCreditIqd }, { hideZero: true })}
                              {" / "}
                              {formatCurrencyPair({ usd: worker.totalDebitUsd, iqd: worker.totalDebitIqd }, { hideZero: true })}
                            </Typography.Text>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </Space>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card title={t.invoicesSummary}>
            {data.invoicesSummary.length === 0 ? (
              <Empty description={t.noneYet} />
            ) : (
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {data.invoicesSummary.slice(0, 6).map((invoice) => (
                  <Link href={`/expenses/${invoice.id}`} key={invoice.id}>
                    <div style={{ cursor: "pointer", borderRadius: 8, border: "1px solid #e5e0d5", padding: "10px 12px", transition: "background 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <Space size="small" wrap>
                            <Typography.Text strong ellipsis>
                              {invoice.number}
                            </Typography.Text>
                            <Tag color={invoiceStatusColor(invoice.status)}>{t[invoice.status]}</Tag>
                          </Space>
                          <div>
                            <Typography.Text type="secondary">{invoice.supplierName ?? t.noSupplier}</Typography.Text>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <Typography.Text strong>
                            {formatCurrencyPair({ usd: invoice.totalAmountUsd, iqd: invoice.totalAmountIqd })}
                          </Typography.Text>
                          <div>
                            <Typography.Text type="danger">
                              {formatCurrencyPair({ usd: invoice.remainingUsd, iqd: invoice.remainingIqd }, { hideZero: true })}
                            </Typography.Text>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
