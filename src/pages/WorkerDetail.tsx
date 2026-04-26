import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, Pencil, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  createWorkerTransaction,
  deleteWorker,
  deleteWorkerTransaction,
  erpKeys,
  getAppSettings,
  getWorker,
  listInvoices,
  listProjects,
  listWorkerTransactions,
  updateWorker,
  updateWorkerTransaction,
  type TransactionType,
  type WorkerTransaction,
} from "@/lib/erp";
import AccountFlowChart from "@/components/finance/AccountFlowChart";
import { formatCurrencyLabel, formatCurrencyPair, formatDate } from "@/lib/format";
import { toErrorMessage } from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";
import { ExpenseForm, ExpenseFormData } from "@/components/expenses/ExpenseForm";
import { useCreateExpense, useExpenseFormData } from "@/hooks/use-create-expense";

type TransactionFormValues = {
  type: TransactionType;
  amountUsd?: number;
  amountIqd?: number;
  description?: string;
  date?: string;
  projectId?: number;
};

type WorkerFormValues = {
  name: string;
  role: string;
  category?: string;
  phone?: string;
};

function WorkerTransactionModal({
  transaction,
  workerId,
  onClose,
}: {
  transaction?: WorkerTransaction;
  workerId: number;
  onClose: () => void;
}) {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<TransactionFormValues>();
  const { data: projects } = useQuery({ queryKey: erpKeys.projects, queryFn: listProjects });
  const { data: appSettings } = useQuery({ queryKey: erpKeys.appSettings, queryFn: getAppSettings });

  const saveMutation = useMutation({
    mutationFn: (values: TransactionFormValues) => {
      const payload = {
        workerId,
        type: values.type,
        amountUsd: Number(values.amountUsd || 0),
        amountIqd: Number(values.amountIqd || 0),
        description: values.description?.trim() || null,
        date: values.date || null,
        projectId: scopedProjectId ?? values.projectId ?? null,
      };

      return transaction ? updateWorkerTransaction(transaction.id, payload) : createWorkerTransaction(payload);
    },
    onSuccess: async () => {
      await erpInvalidation.workerDetail(workerId);
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Modal
      open
      title={transaction ? t.editTransaction : t.newTransaction}
      okText={transaction ? t.save : t.create}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<TransactionFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          type: transaction?.type ?? "debit",
          amountUsd: transaction?.amountUsd ?? 0,
          amountIqd: transaction?.amountIqd ?? 0,
          description: transaction?.description ?? undefined,
          date: transaction?.date ?? new Date().toISOString().slice(0, 10),
          projectId: scopedProjectId ?? transaction?.projectId ?? undefined,
        }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="type" label={t.type} rules={[{ required: true, message: t.requiredField }]}>
              <Select
                options={[
                  { label: t.credit, value: "credit" },
                  { label: t.debit, value: "debit" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="amountUsd" label={`${t.amount} ${formatCurrencyLabel("USD")}`}>
              <InputNumber
                min={appSettings?.transactionAmountMinUsd ?? 0}
                max={appSettings?.transactionAmountMaxUsd ?? undefined}
                step={0.01}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="amountIqd" label={`${t.amount} IQD`}>
              <InputNumber
                min={appSettings?.transactionAmountMinIqd ?? 0}
                max={appSettings?.transactionAmountMaxIqd ?? undefined}
                step={1}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="projectId" label={t.txProject}>
              <Select
                disabled={scopedProjectId != null}
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={t.noProjectOption}
                options={projects?.map((project) => ({ label: project.name, value: project.id }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="date" label={t.date} rules={[{ required: true, message: t.dateRequired }]}>
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label={t.description}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function WorkerFormModal({
  worker,
  onClose,
}: {
  worker: { id: number; name: string; role: string | null; category: string | null; phone: string | null };
  onClose: () => void;
}) {
  const { t } = useLang();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<WorkerFormValues>();

  const saveMutation = useMutation({
    mutationFn: async (values: WorkerFormValues) => {
      const payload = {
        name: values.name.trim(),
        role: values.role.trim(),
        category: values.category?.trim() || null,
        phone: values.phone?.trim() || null,
      };

      await updateWorker(worker.id, payload);
    },
    onSuccess: async () => {
      await erpInvalidation.workerDetail(worker.id);
      message.success(t.saved);
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Modal
      open
      title={t.editWorker}
      okText={t.save}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<WorkerFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          name: worker.name,
          role: worker.role ?? "",
          category: worker.category ?? "",
          phone: worker.phone ?? "",
        }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item name="name" label={t.name} rules={[{ required: true, message: t.nameRequired }]}>
          <Input placeholder={t.namePlaceholder} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="role" label={t.role} rules={[{ required: true, message: t.roleRequired }]}>
              <Input placeholder={t.rolePlaceholder} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="category" label={t.category}>
              <Input placeholder={t.categoryPlaceholder} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label={t.phone}>
              <Input placeholder={t.phonePlaceholder} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

function ExpenseModal({
  worker,
  onClose,
}: {
  worker: { id: number; name: string };
  onClose: () => void;
}) {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const erpInvalidation = useErpInvalidation();
  const createExpense = useCreateExpense();
  const { projects, workers, suppliers } = useExpenseFormData();

  const handleSubmit = async (data: ExpenseFormData) => {
    // Pré-remplir avec les données du travailleur
    const expenseData: ExpenseFormData = {
      ...data,
      partyType: 'worker',
      workerId: worker.id,
      projectId: scopedProjectId ?? data.projectId,
    };

    await createExpense.mutateAsync(expenseData);
    await erpInvalidation.workerDetail(worker.id);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      open
      title={`Nouvelle Dépense - ${worker.name}`}
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
          partyType: 'worker',
          workerId: worker.id,
          projectId: scopedProjectId || undefined,
          category: 'salary_payment',
        }}
      />
    </Modal>
  );
}

export default function WorkerDetail() {
  const { id } = useParams<{ id: string }>();
  const workerId = Number(id);
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<typeof transactions[0] | null>(null);

  const { data: appSettings } = useQuery({
    queryKey: erpKeys.appSettings,
    queryFn: getAppSettings,
  });

  const { data: worker, isLoading: workerLoading } = useQuery({
    queryKey: erpKeys.worker(workerId),
    queryFn: () => getWorker(workerId),
    enabled: Number.isFinite(workerId),
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: erpKeys.workerTransactions(workerId),
    queryFn: () => listWorkerTransactions(workerId),
    enabled: Number.isFinite(workerId),
  });
  const { data: invoices } = useQuery({
    queryKey: erpKeys.invoices,
    queryFn: listInvoices,
  });
  const deleteMutation = useMutation({
    mutationFn: (transaction: WorkerTransaction) => deleteWorkerTransaction(transaction.id),
    onSuccess: async () => {
      await erpInvalidation.workerDetail(workerId);
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const deleteWorkerMutation = useMutation({
    mutationFn: () => deleteWorker(workerId),
    onSuccess: async () => {
      message.success(t.deleted);
      window.location.href = "/workers";
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const visibleTransactions =
    scopedProjectId == null
      ? transactions
      : transactions?.filter((transaction) => transaction.projectId === scopedProjectId);
  const transactionRows = visibleTransactions ?? [];
  const invoicesById = new Map((invoices ?? []).map((invoice) => [invoice.id, invoice]));
  const chartBalance = transactionRows.reduce(
    (totals, transaction) => ({
      usd: totals.usd + (transaction.type === "credit" ? transaction.amountUsd : -transaction.amountUsd),
      iqd: totals.iqd + (transaction.type === "credit" ? transaction.amountIqd : -transaction.amountIqd),
    }),
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

  if (workerLoading || !worker) {
    return workerLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : <Empty description={t.notFound} />;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Row align="middle" gutter={[16, 16]} justify="space-between">
        <Col flex="none">
          <Link href="/workers">
            <Button icon={<ArrowLeft size={16} />} />
          </Link>
        </Col>
        <Col flex="auto">
          <Space size="small" wrap>
            <Typography.Title level={2} style={{ margin: 0 }}>
              {worker.name}
            </Typography.Title>
            {worker.category ? <Tag color="blue">{worker.category}</Tag> : null}
          </Space>
          <div>
            <Typography.Text type="secondary">{[worker.role, worker.phone].filter(Boolean).join(" | ")}</Typography.Text>
          </div>
        </Col>
        <Col flex="none">
          <Space>
            <Button
              icon={<Pencil size={16} />}
              onClick={() => setShowWorkerModal(true)}
            >
              {t.edit}
            </Button>
            <Popconfirm
              title={t.deleteWorkerConfirm}
              okText={t.remove}
              cancelText={t.cancel}
              onConfirm={() => deleteWorkerMutation.mutate()}
            >
              <Button danger icon={<Trash2 size={16} />} loading={deleteWorkerMutation.isPending}>
                {t.remove}
              </Button>
            </Popconfirm>
          </Space>
        </Col>
        <Col>
          <div className="text-right">
            <Typography.Title
              level={3}
              type={worker.balanceUsd >= 0 && worker.balanceIqd >= 0 ? "success" : "danger"}
              style={{ margin: 0 }}
            >
              {formatCurrencyPair({ usd: worker.balanceUsd, iqd: worker.balanceIqd })}
            </Typography.Title>
            <Typography.Text type="secondary">
              {worker.balanceUsd >= 0 && worker.balanceIqd >= 0 ? t.positiveBalance : t.negativeBalance}
            </Typography.Text>
          </div>
        </Col>
      </Row>

      {transactionsLoading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <AccountFlowChart
          amountLabel={t.amount}
          balance={scopedProjectId == null ? { usd: worker.balanceUsd, iqd: worker.balanceIqd } : chartBalance}
          balanceLabel={t.balance}
          countLabel={t.transactionsCount(transactionRows.length)}
          credit={creditTotals}
          creditLabel={t.credit}
          dateLabel={t.date}
          debit={debitTotals}
          debitLabel={t.debit}
          empty={!transactionRows.length}
          emptyDescription={t.noTransactions}
          entries={chartEntries}
          exchangeRateIqdPer100Usd={appSettings?.exchangeRateIqdPer100Usd}
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
                    <>
                      <Button
                        type="text"
                        icon={<Pencil size={16} />}
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setShowModal(true);
                        }}
                      />
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
                    </>
                  ) : null}
                </Space>
              </div>
            </Card>
          ))}
        </Space>
      )}

      {showExpenseModal && worker ? (
        <ExpenseModal
          worker={{ id: worker.id, name: worker.name }}
          onClose={() => setShowExpenseModal(false)}
        />
      ) : null}

      {showWorkerModal && worker ? (
        <WorkerFormModal
          worker={worker}
          onClose={() => setShowWorkerModal(false)}
        />
      ) : null}

      {showModal && worker ? (
        <WorkerTransactionModal
          transaction={selectedTransaction || undefined}
          workerId={worker.id}
          onClose={() => {
            setShowModal(false);
            setSelectedTransaction(null);
          }}
        />
      ) : null}
    </Space>
  );
}
