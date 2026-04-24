import type { ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, FolderKanban, Truck, Users } from "lucide-react";
import { Card, Col, Empty, Progress, Row, Skeleton, Space, Tag, Typography } from "antd";
import { erpKeys, getDashboardOverview, type InvoiceStatus, type ProjectStatus } from "@/lib/erp";
import { formatCurrency } from "@/lib/format";
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
      <div className="flex items-start justify-between gap-4">
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
  const { data, isLoading } = useQuery({
    queryKey: erpKeys.dashboard,
    queryFn: getDashboardOverview,
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

  const paymentPercent =
    data.totalInvoiceAmount > 0 ? Math.round((data.totalPaidAmount / data.totalInvoiceAmount) * 100) : 0;

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
                {formatCurrency(data.totalInvoiceAmount)}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small">
              <Typography.Text type="success">{t.amountPaid}</Typography.Text>
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                {formatCurrency(data.totalPaidAmount)}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small">
              <Typography.Text type="warning">{t.remaining}</Typography.Text>
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                {formatCurrency(data.remainingAmount)}
              </Typography.Title>
            </Card>
          </Col>
        </Row>
        <Progress percent={paymentPercent} style={{ marginTop: 20 }} />
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
                    <div className="cursor-pointer rounded-md border border-border px-3 py-3 transition hover:bg-muted/40">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <Typography.Text strong ellipsis>
                            {project.name}
                          </Typography.Text>
                          <div style={{ marginTop: 6 }}>
                            <Tag color={projectStatusColor(project.status)}>{t[project.status]}</Tag>
                          </div>
                        </div>
                        <div className="text-right">
                          <Typography.Text strong>{formatCurrency(project.totalInvoiced)}</Typography.Text>
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
                    <div className="cursor-pointer rounded-md border border-border px-3 py-3 transition hover:bg-muted/40">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <Typography.Text strong ellipsis>
                            {worker.name}
                          </Typography.Text>
                          <div>
                            <Typography.Text type="secondary">{worker.role}</Typography.Text>
                          </div>
                        </div>
                        <div className="text-right">
                          <Typography.Text strong type={worker.balance >= 0 ? "success" : "danger"}>
                            {formatCurrency(worker.balance)}
                          </Typography.Text>
                          <div>
                            <Typography.Text type="secondary">
                              {formatCurrency(worker.totalCredit)} / {formatCurrency(worker.totalDebit)}
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
                    <div className="cursor-pointer rounded-md border border-border px-3 py-3 transition hover:bg-muted/40">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
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
                        <div className="text-right">
                          <Typography.Text strong>{formatCurrency(invoice.totalAmount)}</Typography.Text>
                          <div>
                            <Typography.Text type="danger">{formatCurrency(invoice.remaining)}</Typography.Text>
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
