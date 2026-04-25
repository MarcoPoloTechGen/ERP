import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
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
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  createWorkerTransaction,
  erpKeys,
  getAppSettings,
  getWorker,
  listInvoices,
  listProjects,
  listWorkerTransactions,
  type TransactionType,
} from "@/lib/erp";
import AccountFlowChart from "@/components/finance/AccountFlowChart";
import { formatCurrencyLabel, formatCurrencyPair, formatDate } from "@/lib/format";
import { toErrorMessage } from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";

type TransactionFormValues = {
  type: TransactionType;
  amountUsd?: number;
  amountIqd?: number;
  description?: string;
  date?: string;
  projectId?: number;
};

function TransactionModal({
  workerId,
  onClose,
}: {
  workerId: number;
  onClose: () => void;
}) {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<TransactionFormValues>();
  const { data: projects } = useQuery({ queryKey: erpKeys.projects, queryFn: listProjects });

  const createMutation = useMutation({
    mutationFn: (values: TransactionFormValues) =>
      createWorkerTransaction({
        workerId,
        type: values.type,
        amountUsd: Number(values.amountUsd || 0),
        amountIqd: Number(values.amountIqd || 0),
        description: values.description?.trim() || null,
        date: values.date || null,
        projectId: scopedProjectId ?? values.projectId ?? null,
      }),
    onSuccess: async () => {
      await erpInvalidation.workerDetail(workerId);
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Modal
      open
      title={t.newTransaction}
      okText={t.create}
      cancelText={t.cancel}
      confirmLoading={createMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<TransactionFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          type: "credit",
          amountUsd: 0,
          amountIqd: 0,
          date: new Date().toISOString().slice(0, 10),
          projectId: scopedProjectId ?? undefined,
        }}
        onFinish={(values) => createMutation.mutate(values)}
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
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="amountIqd" label={`${t.amount} IQD`}>
              <InputNumber min={0} step={1} style={{ width: "100%" }} />
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

export default function WorkerDetail() {
  const { id } = useParams<{ id: string }>();
  const workerId = Number(id);
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const [showModal, setShowModal] = useState(false);

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
          <Button type="primary" onClick={() => setShowModal(true)}>
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
                <Typography.Text strong type={transaction.type === "credit" ? "success" : "danger"}>
                  {transaction.type === "credit" ? "+" : "-"}
                  {formatCurrencyPair({ usd: transaction.amountUsd, iqd: transaction.amountIqd }, { hideZero: true })}
                </Typography.Text>
              </div>
            </Card>
          ))}
        </Space>
      )}

      {showModal ? <TransactionModal workerId={workerId} onClose={() => setShowModal(false)} /> : null}
    </Space>
  );
}
