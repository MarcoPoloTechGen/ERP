import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { Button, Card, Col, Empty, Image, Progress, Row, Skeleton, Space, Table, Tag, Typography } from "antd";
import { erpKeys, getInvoice, listInvoiceHistory, markInvoicePaid, type InvoiceStatus } from "@/lib/erp";
import { formatCurrencyLabel, formatCurrencyPair, formatDate, formatDateTime } from "@/lib/format";
import { useLang } from "@/lib/i18n";

function invoiceStatusColor(status: InvoiceStatus) {
  if (status === "paid") {
    return "green";
  }
  if (status === "partial") {
    return "orange";
  }
  return "red";
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: erpKeys.invoice(invoiceId),
    queryFn: () => getInvoice(invoiceId),
    enabled: Number.isFinite(invoiceId),
  });
  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: erpKeys.invoiceHistory(invoiceId),
    queryFn: () => listInvoiceHistory(invoiceId),
    enabled: Number.isFinite(invoiceId),
  });

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      if (!invoice) {
        return;
      }
      await markInvoicePaid(invoice.id, {
        totalAmountUsd: invoice.totalAmountUsd,
        totalAmountIqd: invoice.totalAmountIqd,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.invoice(invoiceId) }),
        queryClient.invalidateQueries({ queryKey: erpKeys.invoiceHistory(invoiceId) }),
        queryClient.invalidateQueries({ queryKey: erpKeys.invoices }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
    },
  });

  if (isLoading || !invoice) {
    return isLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : <Empty description={t.notFound} />;
  }

  const progressUsd =
    invoice.totalAmountUsd > 0 ? Math.min(100, Math.round((invoice.paidAmountUsd / invoice.totalAmountUsd) * 100)) : 0;
  const progressIqd =
    invoice.totalAmountIqd > 0 ? Math.min(100, Math.round((invoice.paidAmountIqd / invoice.totalAmountIqd) * 100)) : 0;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Row align="middle" gutter={[16, 16]} justify="space-between">
        <Col flex="none">
          <Link href="/expenses">
            <Button icon={<ArrowLeft size={16} />} />
          </Link>
        </Col>
        <Col flex="auto">
          <Space size="small" wrap>
            <Typography.Title level={2} style={{ margin: 0 }}>
              {invoice.number}
            </Typography.Title>
            <Tag color={invoiceStatusColor(invoice.status)}>{t[invoice.status]}</Tag>
            {invoice.recordStatus === "deleted" ? <Tag>{t.deleted}</Tag> : null}
          </Space>
          <div>
            <Typography.Text type="secondary">{invoice.supplierName ?? t.noSupplier}</Typography.Text>
          </div>
        </Col>
        {invoice.recordStatus === "active" && invoice.status !== "paid" ? (
          <Col>
            <Button
              type="primary"
              icon={<CheckCircle2 size={16} />}
              loading={markPaidMutation.isPending}
              onClick={() => markPaidMutation.mutate()}
            >
              {t.markPaid}
            </Button>
          </Col>
        ) : null}
      </Row>

      {invoice.imageUrl ? (
        <Card
          title={
            <Space>
              <ImageIcon size={16} />
              <span>{t.receiptImage}</span>
            </Space>
          }
        >
          <Image
            src={invoice.imageUrl}
            alt={t.receiptImage}
            style={{ maxHeight: 260, objectFit: "contain" }}
            preview={{ visible: previewOpen, onVisibleChange: setPreviewOpen }}
          />
        </Card>
      ) : null}

      <Card title={t.expenseDetails}>
        <Row gutter={[16, 16]}>
          {[
            [t.supplierOption, invoice.supplierName ?? "-"],
            [t.projectOption, invoice.projectName ?? "-"],
            [t.invoiceAssignment, invoice.buildingName ?? t.projectGlobalCost],
            [t.products, invoice.productName ?? "-"],
            [t.user, invoice.createdByName ?? "-"],
            [t.invoiceDate, formatDate(invoice.invoiceDate)],
            [t.dueDate, formatDate(invoice.dueDate)],
          ].map(([label, value]) => (
            <Col key={label} xs={24} md={12}>
              <Typography.Text type="secondary">{label}</Typography.Text>
              <div><Typography.Text strong>{value}</Typography.Text></div>
            </Col>
          ))}
        </Row>

        {invoice.notes ? (
          <div style={{ marginTop: 16 }}>
            <Typography.Text type="secondary">{t.notes}</Typography.Text>
            <Typography.Paragraph>{invoice.notes}</Typography.Paragraph>
          </div>
        ) : null}
      </Card>

      <Card title={t.financialSummaryInv}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card size="small">
                <Typography.Text type="secondary">{t.totalAmount}</Typography.Text>
                <div>
                  <Typography.Text strong>
                    {formatCurrencyPair({ usd: invoice.totalAmountUsd, iqd: invoice.totalAmountIqd })}
                  </Typography.Text>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small">
                <Typography.Text type="success">{t.alreadyPaid}</Typography.Text>
                <div>
                  <Typography.Text strong>
                    {formatCurrencyPair({ usd: invoice.paidAmountUsd, iqd: invoice.paidAmountIqd })}
                  </Typography.Text>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small">
                <Typography.Text type="warning">{t.remaining_label}</Typography.Text>
                <div>
                  <Typography.Text strong>
                    {formatCurrencyPair({ usd: invoice.remainingAmountUsd, iqd: invoice.remainingAmountIqd })}
                  </Typography.Text>
                </div>
              </Card>
            </Col>
          </Row>
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Progress percent={progressUsd} format={(percent) => `${formatCurrencyLabel("USD")} ${percent}%`} />
            <Progress percent={progressIqd} format={(percent) => `IQD ${percent}%`} />
          </Space>
        </Space>
      </Card>

      <Card title={t.expenseLog}>
        {isHistoryLoading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : !history?.length ? (
          <Empty description={t.noExpenseLog} />
        ) : (
          <Table
            rowKey="id"
            size="small"
            dataSource={history}
            scroll={{ x: 1500 }}
            pagination={false}
            columns={[
              { title: t.date, dataIndex: "changedAt", render: (value) => formatDateTime(value) },
              { title: t.user, dataIndex: "changedByName", render: (value) => value ?? "-" },
              {
                title: t.changeType,
                dataIndex: "action",
                render: (value) => (value === "updated" ? t.changeUpdated : t.changeCreated),
              },
              { title: t.expenseTitle, dataIndex: "number" },
              {
                title: t.status,
                dataIndex: "status",
                render: (value: InvoiceStatus) => <Tag color={invoiceStatusColor(value)}>{t[value]}</Tag>,
              },
              { title: t.supplierOption, dataIndex: "supplierName", render: (value) => value ?? "-" },
              { title: t.projectOption, dataIndex: "projectName", render: (value) => value ?? "-" },
              { title: t.invoiceAssignment, dataIndex: "buildingName", render: (value) => value ?? t.projectGlobalCost },
              { title: t.products, dataIndex: "productName", render: (value) => value ?? "-" },
              {
                title: t.totalAmount,
                dataIndex: "totalAmountUsd",
                align: "right",
                render: (_value, row) => formatCurrencyPair({ usd: row.totalAmountUsd, iqd: row.totalAmountIqd }),
              },
              {
                title: t.paidAmount,
                dataIndex: "paidAmountUsd",
                align: "right",
                render: (_value, row) => formatCurrencyPair({ usd: row.paidAmountUsd, iqd: row.paidAmountIqd }),
              },
              {
                title: t.remaining_label,
                dataIndex: "remainingAmountUsd",
                align: "right",
                render: (_value, row) => formatCurrencyPair({ usd: row.remainingAmountUsd, iqd: row.remainingAmountIqd }),
              },
              { title: t.invoiceDate, dataIndex: "invoiceDate", render: (value) => formatDate(value) },
              { title: t.dueDate, dataIndex: "dueDate", render: (value) => formatDate(value) },
              { title: t.notes, dataIndex: "notes", render: (value) => value ?? "-" },
              {
                title: t.receiptImage,
                dataIndex: "imageUrl",
                render: (value: string | null) =>
                  value ? <Image width={48} height={48} src={value} alt={t.receiptImage} /> : "-",
              },
            ]}
          />
        )}
      </Card>
    </Space>
  );
}
