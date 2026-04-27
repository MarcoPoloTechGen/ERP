import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, FileText, Pencil, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import AccountFlowChart from "@/components/finance/AccountFlowChart";
import { invoiceStatusColor, invoiceStatusLabel } from "@/components/invoices/invoice-shared";
import {
  deleteSupplier,
  deleteSupplierTransaction,
  erpKeys,
  getSupplier,
  listInvoices,
  listSupplierTransactions,
  updateSupplier,
  type SupplierTransaction,
} from "@/lib/erp";
import { formatCurrencyLabel, formatCurrencyPair, formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { toErrorMessage } from "@/lib/refine-helpers";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";
import { ExpenseForm, ExpenseFormData } from "@/components/expenses/ExpenseForm";
import { useCreateExpense, useExpenseFormData } from "@/hooks/use-create-expense";

type SupplierFormValues = {
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
};

function SupplierFormModal({
  supplier,
  onClose,
}: {
  supplier: {
    id: number;
    name: string;
    contact: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  onClose: () => void;
}) {
  const { t } = useLang();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<SupplierFormValues>();

  const saveMutation = useMutation({
    mutationFn: async (values: SupplierFormValues) => {
      const payload = {
        name: values.name.trim(),
        contact: values.contact?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        address: values.address?.trim() || null,
      };

      await updateSupplier(supplier.id, payload);
    },
    onSuccess: async () => {
      await erpInvalidation.supplierDetail(supplier.id);
      message.success(t.saved);
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Modal
      open
      title={t.editSupplier}
      okText={t.save}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<SupplierFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          name: supplier.name,
          contact: supplier.contact ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
        }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item name="name" label={t.name} rules={[{ required: true, message: t.nameRequired }]}>
          <Input placeholder={t.namePlaceholder} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="contact" label={t.contact}>
              <Input placeholder={t.contactPlaceholder} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label={t.phoneSup}>
              <Input placeholder={t.phonePlaceholder} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="email" label={t.email}>
              <Input type="email" placeholder={t.emailPlaceholder} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="address" label={t.address}>
              <Input placeholder={t.addressPlaceholder} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

function ExpenseModal({
  supplier,
  onClose,
}: {
  supplier: { id: number; name: string };
  onClose: () => void;
}) {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const erpInvalidation = useErpInvalidation();
  const createExpense = useCreateExpense();
  const { projects, workers, suppliers } = useExpenseFormData();

  const handleSubmit = async (data: ExpenseFormData) => {
    const expenseData: ExpenseFormData = {
      ...data,
      partyType: 'supplier',
      supplierId: supplier.id,
      projectId: scopedProjectId ?? data.projectId,
    };

    await createExpense.mutateAsync(expenseData);
    await erpInvalidation.supplierDetail(supplier.id);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      open
      title={`Nouvelle Dépense - ${supplier.name}`}
      footer={null}
      onCancel={onClose}
      width={800}
    >
      <ExpenseForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        title=""
        description=""
        isLoading={createExpense.isPending}
        projects={projects}
        workers={workers}
        suppliers={suppliers}
        initialData={{
          partyType: 'supplier',
          supplierId: supplier.id,
          projectId: scopedProjectId || undefined,
          category: 'supplier_payment',
        }}
      />
    </Modal>
  );
}

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const supplierId = Number(id);
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  const { data: supplier, isLoading: supplierLoading } = useQuery({
    queryKey: erpKeys.supplier(supplierId),
    queryFn: () => getSupplier(supplierId),
    enabled: Number.isFinite(supplierId),
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: erpKeys.supplierTransactions(supplierId),
    queryFn: () => listSupplierTransactions(supplierId),
    enabled: Number.isFinite(supplierId),
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: erpKeys.invoices,
    queryFn: listInvoices,
  });
  const deleteMutation = useMutation({
    mutationFn: (transaction: SupplierTransaction) => deleteSupplierTransaction(transaction.id),
    onSuccess: async () => {
      await erpInvalidation.supplierDetail(supplierId);
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: () => deleteSupplier(supplierId),
    onSuccess: async () => {
      message.success(t.deleted);
      window.location.href = "/suppliers";
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const supplierInvoices = useMemo(() => {
    return (invoices ?? []).filter(
      (invoice) =>
        invoice.recordStatus === "active" &&
        invoice.supplierId === supplierId &&
        (scopedProjectId == null || invoice.projectId === scopedProjectId),
    );
  }, [invoices, scopedProjectId, supplierId]);

  const visibleTransactions =
    scopedProjectId == null
      ? transactions
      : transactions?.filter((transaction) => transaction.projectId === scopedProjectId);
  const transactionRows = visibleTransactions ?? [];
  const invoicesById = new Map((invoices ?? []).map((invoice) => [invoice.id, invoice]));
  const balance = transactionRows.reduce(
    (totals, transaction) => ({
      usd: totals.usd + (transaction.type === "credit" ? transaction.amountUsd : -transaction.amountUsd),
      iqd: totals.iqd + (transaction.type === "credit" ? transaction.amountIqd : -transaction.amountIqd),
    }),
    { usd: 0, iqd: 0 },
  );
  const creditTotals = transactionRows.reduce(
    (totals, transaction) =>
      transaction.type === "credit"
        ? {
            usd: totals.usd + transaction.amountUsd,
            iqd: totals.iqd + transaction.amountIqd,
          }
        : totals,
    { usd: 0, iqd: 0 },
  );
  const debitTotals = transactionRows.reduce(
    (totals, transaction) =>
      transaction.type === "debit"
        ? {
            usd: totals.usd + transaction.amountUsd,
            iqd: totals.iqd + transaction.amountIqd,
          }
        : totals,
    { usd: 0, iqd: 0 },
  );
  const chartEntries = transactionRows.map((transaction) => ({
    id: transaction.id,
    date: transaction.date,
    creditUsd: transaction.type === "credit" ? transaction.amountUsd : 0,
    creditIqd: transaction.type === "credit" ? transaction.amountIqd : 0,
    debitUsd: transaction.type === "debit" ? transaction.amountUsd : 0,
    debitIqd: transaction.type === "debit" ? transaction.amountIqd : 0,
    balanceDeltaUsd: transaction.type === "credit" ? transaction.amountUsd : -transaction.amountUsd,
    balanceDeltaIqd: transaction.type === "credit" ? transaction.amountIqd : -transaction.amountIqd,
    transactionUsd: transaction.type === "credit" ? transaction.amountUsd : -transaction.amountUsd,
    transactionIqd: transaction.type === "credit" ? transaction.amountIqd : -transaction.amountIqd,
    buildingName:
      transaction.sourceInvoiceId != null
        ? invoicesById.get(transaction.sourceInvoiceId)?.buildingName ?? t.projectGlobalCost
        : transaction.projectName,
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
        <Col flex="none">
          <Space>
            <Button
              icon={<Pencil size={16} />}
              onClick={() => setShowSupplierModal(true)}
            >
              {t.edit}
            </Button>
            <Popconfirm
              title={t.deleteSupplierConfirm}
              okText={t.remove}
              cancelText={t.cancel}
              onConfirm={() => deleteSupplierMutation.mutate()}
            >
              <Button danger icon={<Trash2 size={16} />} loading={deleteSupplierMutation.isPending}>
                {t.remove}
              </Button>
            </Popconfirm>
          </Space>
        </Col>
        <Col>
          <div className="text-right">
            <Typography.Title level={3} style={{ margin: 0 }}>
              {formatCurrencyPair(balance)}
            </Typography.Title>
            <Typography.Text type="secondary">{t.remaining_label}</Typography.Text>
          </div>
        </Col>
      </Row>

      {transactionsLoading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <AccountFlowChart
          amountLabel={t.amount}
          balance={balance}
          balanceLabel={t.remaining_label}
          countLabel={t.transactionsCount(transactionRows.length)}
          credit={creditTotals}
          creditLabel={t.totalAmount}
          dateLabel={t.date}
          debit={debitTotals}
          debitLabel={t.paidAmount}
          empty={!transactionRows.length}
          emptyDescription={t.noTransactions}
          entries={chartEntries}
          title={t.debitCredit}
        />
      )}

      <Card
        title={t.transactions}
        extra={
          <Button
            type="primary"
            onClick={() => {
              setShowExpenseModal(true);
            }}
          >
            {t.addTransaction}
          </Button>
        }
      >
        <Typography.Text type="secondary">{t.transactionsCount(visibleTransactions?.length ?? 0)}</Typography.Text>
      </Card>

      {transactionsLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : !visibleTransactions?.length ? (
        <Empty description={t.noTransactions} />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {visibleTransactions.map((transaction) => (
            <Card key={transaction.id} size="small">
              <div className="flex items-center justify-between gap-4">
                <Space>
                  {transaction.type === "credit" ? (
                    <TrendingUp size={18} color="#047857" />
                  ) : (
                    <TrendingDown size={18} color="#be123c" />
                  )}
                  <div>
                    <Typography.Text strong>
                      {transaction.description ?? (transaction.type === "credit" ? t.creditLabel : t.debitLabel)}
                    </Typography.Text>
                    <div>
                      <Typography.Text type="secondary">
                        {[formatDate(transaction.date), transaction.projectName].filter(Boolean).join(" | ")}
                      </Typography.Text>
                    </div>
                  </div>
                </Space>
                <Space size="small">
                  <Typography.Text strong type={transaction.type === "credit" ? "success" : "danger"}>
                    {transaction.type === "credit" ? "+" : "-"}
                    {formatCurrencyPair(
                      { usd: transaction.amountUsd, iqd: transaction.amountIqd },
                      { hideZero: true },
                    )}
                  </Typography.Text>
                  {transaction.canManage ? (
                    <Popconfirm
                      title={t.deleteTransactionConfirm}
                      okText={t.remove}
                      cancelText={t.cancel}
                      onConfirm={() => deleteMutation.mutate(transaction)}
                    >
                      <Button
                        danger
                        type="text"
                        icon={<Trash2 size={16} />}
                        loading={deleteMutation.isPending}
                      />
                    </Popconfirm>
                  ) : null}
                </Space>
              </div>
            </Card>
          ))}
        </Space>
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

      {showExpenseModal && supplier ? (
        <ExpenseModal
          supplier={{ id: supplier.id, name: supplier.name }}
          onClose={() => setShowExpenseModal(false)}
        />
      ) : null}

      {showSupplierModal && supplier ? (
        <SupplierFormModal
          supplier={supplier}
          onClose={() => setShowSupplierModal(false)}
        />
      ) : null}
    </Space>
  );
}
