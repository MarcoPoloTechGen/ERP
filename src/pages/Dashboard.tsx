import { useMemo, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, FolderKanban, Truck, Users } from "lucide-react";
import { Card, Col, Empty, Progress, Row, Skeleton, Space, Tag, Typography } from "antd";
import { erpKeys, getDashboardOverview, listInvoices, listProjectAlerts, type InvoiceStatus, type ProjectStatus } from "@/lib/erp";
import { dateReminderStatus, daysUntilDate, isDateReminderVisible, type DateReminderStatus } from "@/lib/date-reminders";
import { formatCurrencyLabel, formatCurrencyPair, formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";

const REMINDER_WINDOW_DAYS = 7;

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

function reminderColor(status: DateReminderStatus) {
  if (status === "overdue") {
    return "red";
  }

  if (status === "today") {
    return "gold";
  }

  return "blue";
}

function reminderLabel(status: DateReminderStatus, daysUntil: number, t: ReturnType<typeof useLang>["t"]) {
  if (status === "overdue") {
    return t.overdueReminder;
  }

  if (status === "today") {
    return t.todayReminder;
  }

  return t.upcomingReminderDays(daysUntil);
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
  const { data: invoices } = useQuery({
    queryKey: [...erpKeys.invoices, "date-reminders", selectedProjectId],
    queryFn: listInvoices,
  });
  const { data: projectAlerts } = useQuery({
    queryKey: erpKeys.projectAlerts(selectedProjectId ?? "all"),
    queryFn: () => listProjectAlerts(selectedProjectId),
  });

  const dateReminders = useMemo(() => {
    const invoiceReminders = (invoices ?? [])
      .filter(
        (invoice) =>
          invoice.recordStatus === "active" &&
          invoice.status !== "paid" &&
          invoice.dueDate != null &&
          (selectedProjectId == null || invoice.projectId === selectedProjectId),
      )
      .map((invoice) => {
        const daysUntil = daysUntilDate(invoice.dueDate);
        return daysUntil == null
          ? null
          : {
              id: `invoice-${invoice.id}`,
              title: invoice.number,
              subtitle: [invoice.supplierName ?? t.noSupplier, invoice.projectName].filter(Boolean).join(" - "),
              href: `/expenses/${invoice.id}`,
              date: invoice.dueDate,
              amount: { usd: invoice.remainingAmountUsd, iqd: invoice.remainingAmountIqd },
              daysUntil,
              status: dateReminderStatus(daysUntil),
            };
      })
      .filter((reminder) => reminder != null && isDateReminderVisible(reminder.daysUntil, REMINDER_WINDOW_DAYS));

    const manualAlertReminders = (projectAlerts ?? [])
      .map((alert) => {
        const daysUntil = daysUntilDate(alert.alertDate);
        return daysUntil == null
          ? null
          : {
              id: `project-alert-${alert.id}`,
              title: alert.note,
              subtitle: t.manualAlert,
              href: `/projects/${alert.projectId}`,
              date: alert.alertDate,
              amount: null,
              daysUntil,
              status: dateReminderStatus(daysUntil),
            };
      })
      .filter((reminder) => reminder != null && isDateReminderVisible(reminder.daysUntil, REMINDER_WINDOW_DAYS));

    return [...invoiceReminders, ...manualAlertReminders]
      .sort(
        (left, right) =>
          left.daysUntil - right.daysUntil ||
          (right.amount?.usd ?? 0) - (left.amount?.usd ?? 0) ||
          (right.amount?.iqd ?? 0) - (left.amount?.iqd ?? 0) ||
          left.title.localeCompare(right.title),
      )
      .slice(0, 6);
  }, [invoices, projectAlerts, selectedProjectId, t.manualAlert, t.noSupplier]);

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

      <Card title={t.dateReminders}>
        <Typography.Text type="secondary">{t.dateRemindersSub}</Typography.Text>
        {dateReminders.length === 0 ? (
          <Empty description={t.noDateReminders} style={{ marginTop: 16 }} />
        ) : (
          <Space direction="vertical" size="middle" style={{ width: "100%", marginTop: 16 }}>
            {dateReminders.map((reminder) => (
              <Link href={reminder.href} key={reminder.id}>
                <div style={{ cursor: "pointer", borderRadius: 8, border: "1px solid #e5e0d5", padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <Space size="small" wrap>
                        <Typography.Text strong ellipsis>
                          {reminder.title}
                        </Typography.Text>
                        <Tag color={reminderColor(reminder.status)}>
                          {reminderLabel(reminder.status, reminder.daysUntil, t)}
                        </Tag>
                      </Space>
                      <div>
                        <Typography.Text type="secondary">{reminder.subtitle}</Typography.Text>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 180 }}>
                      {reminder.amount ? (
                        <Typography.Text strong>
                          {formatCurrencyPair(reminder.amount, { hideZero: true })}
                        </Typography.Text>
                      ) : null}
                      <div>
                        <Typography.Text type={reminder.status === "overdue" ? "danger" : "secondary"}>
                          {formatDate(reminder.date)}
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

      <Card title={t.financialSummary} extra={<Typography.Text type="secondary">{t.paymentProgress}</Typography.Text>}>
        <Row gutter={[16, 16]}>
          <Col xs={12} md={8}>
            <Card size="small">
              <Typography.Text type="secondary">{t.totalInvoiced}</Typography.Text>
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                {formatCurrencyPair({ usd: data.totalInvoiceAmountUsd, iqd: data.totalInvoiceAmountIqd })}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={12} md={8}>
            <Card size="small">
              <Typography.Text type="warning">{t.remaining}</Typography.Text>
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                {formatCurrencyPair({ usd: data.remainingAmountUsd, iqd: data.remainingAmountIqd })}
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
                        <div className="erp-invoice-amount-pair" style={{ minWidth: 260 }}>
                          <div className="erp-invoice-amount-cell">
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t.totalAmount}</Typography.Text>
                            <div>
                              <Typography.Text strong>
                                {formatCurrencyPair({ usd: invoice.totalAmountUsd, iqd: invoice.totalAmountIqd })}
                              </Typography.Text>
                            </div>
                          </div>
                          <div className="erp-invoice-amount-cell">
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t.remaining}</Typography.Text>
                            <div>
                            <Typography.Text type="danger">
                              {formatCurrencyPair({ usd: invoice.remainingUsd, iqd: invoice.remainingIqd }, { hideZero: true })}
                            </Typography.Text>
                            </div>
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
