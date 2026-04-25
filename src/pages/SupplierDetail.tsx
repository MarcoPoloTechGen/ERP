import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import { Button, Card, Col, Empty, Row, Skeleton, Space, Tag, Typography } from "antd";
import AccountFlowChart from "@/components/finance/AccountFlowChart";
import { invoiceStatusColor, invoiceStatusLabel } from "@/components/invoices/invoice-shared";
import { erpKeys, getSupplier, listInvoices } from "@/lib/erp";
import { formatCurrencyPair, formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const supplierId = Number(id);
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();

  const { data: supplier, isLoading: supplierLoading } = useQuery({
    queryKey: erpKeys.supplier(supplierId),
    queryFn: () => getSupplier(supplierId),
    enabled: Number.isFinite(supplierId),
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: erpKeys.invoices,
    queryFn: listInvoices,
  });

  const supplierInvoices = useMemo(() => {
    return (invoices ?? []).filter(
      (invoice) =>
        invoice.recordStatus === "active" &&
        invoice.supplierId === supplierId &&
        (scopedProjectId == null || invoice.projectId === scopedProjectId),
    );
  }, [invoices, scopedProjectId, supplierId]);

  const totals = supplierInvoices.reduce(
    (current, invoice) => ({
      paid: {
        usd: current.paid.usd + invoice.paidAmountUsd,
        iqd: current.paid.iqd + invoice.paidAmountIqd,
      },
      remaining: {
        usd: current.remaining.usd + invoice.remainingAmountUsd,
        iqd: current.remaining.iqd + invoice.remainingAmountIqd,
      },
      total: {
        usd: current.total.usd + invoice.totalAmountUsd,
        iqd: current.total.iqd + invoice.totalAmountIqd,
      },
    }),
    {
      paid: { usd: 0, iqd: 0 },
      remaining: { usd: 0, iqd: 0 },
      total: { usd: 0, iqd: 0 },
    },
  );
  const chartEntries = supplierInvoices.map((invoice) => ({
    id: invoice.id,
    date: invoice.invoiceDate,
    creditUsd: invoice.paidAmountUsd,
    creditIqd: invoice.paidAmountIqd,
    debitUsd: invoice.totalAmountUsd,
    debitIqd: invoice.totalAmountIqd,
  }));

  if (supplierLoading || !supplier) {
    return supplierLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : <Empty description={t.notFound} />;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Row align="middle" gutter={[16, 16]} justify="space-between">
        <Col flex="none">
          <Link href="/suppliers">
            <Button icon={<ArrowLeft size={16} />} />
          </Link>
        </Col>
        <Col flex="auto">
          <Typography.Title level={2} style={{ margin: 0 }}>
            {supplier.name}
          </Typography.Title>
          <div>
            <Typography.Text type="secondary">
              {[supplier.contact, supplier.phone, supplier.email, supplier.address].filter(Boolean).join(" | ")}
            </Typography.Text>
          </div>
        </Col>
        <Col>
          <div className="text-right">
            <Typography.Title level={3} style={{ margin: 0 }}>
              {formatCurrencyPair(totals.remaining)}
            </Typography.Title>
            <Typography.Text type="secondary">{t.remaining_label}</Typography.Text>
          </div>
        </Col>
      </Row>

      {invoicesLoading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <AccountFlowChart
          amountLabel={t.amount}
          balance={totals.remaining}
          balanceLabel={t.remaining_label}
          countLabel={t.expense_count(supplierInvoices.length)}
          credit={totals.paid}
          creditLabel={t.paidAmount}
          dateLabel={t.date}
          debit={totals.total}
          debitLabel={t.totalAmount}
          empty={!supplierInvoices.length}
          emptyDescription={t.noExpenses}
          entries={chartEntries}
          title={t.debitCredit}
        />
      )}

      <Card
        title={
          <Space>
            <FileText size={16} />
            <span>{t.expense_count(supplierInvoices.length)}</span>
          </Space>
        }
      >
        {invoicesLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : !supplierInvoices.length ? (
          <Empty description={t.noExpenses} />
        ) : (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {supplierInvoices.map((invoice) => (
              <Link href={`/expenses/${invoice.id}`} key={invoice.id}>
                <div className="cursor-pointer rounded-md border border-border px-3 py-3 transition hover:bg-muted/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Space size="small" wrap>
                        <Typography.Text strong>{invoice.number}</Typography.Text>
                        <Tag color={invoiceStatusColor[invoice.status]}>{invoiceStatusLabel(invoice.status, t)}</Tag>
                      </Space>
                      <div>
                        <Typography.Text type="secondary">
                          {[
                            formatDate(invoice.invoiceDate),
                            invoice.projectName ?? t.noProjectOption,
                            invoice.buildingName ?? t.projectGlobalCost,
                            invoice.productName,
                          ]
                            .filter(Boolean)
                            .join(" | ")}
                        </Typography.Text>
                      </div>
                    </div>
                    <div className="text-right">
                      <Typography.Text strong>
                        {formatCurrencyPair({ usd: invoice.totalAmountUsd, iqd: invoice.totalAmountIqd })}
                      </Typography.Text>
                      <div>
                        <Typography.Text type="secondary">
                          {t.paidAmount}:{" "}
                          {formatCurrencyPair(
                            { usd: invoice.paidAmountUsd, iqd: invoice.paidAmountIqd },
                            { hideZero: true },
                          )}
                        </Typography.Text>
                      </div>
                      <div>
                        <Typography.Text type="secondary">
                          {t.remaining_label}:{" "}
                          {formatCurrencyPair(
                            { usd: invoice.remainingAmountUsd, iqd: invoice.remainingAmountIqd },
                            { hideZero: true },
                          )}
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
    </Space>
  );
}
