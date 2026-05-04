import { useEffect, useMemo, useState } from "react";
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
  Modal,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Space,
  Typography,
} from "antd";
import {
  deleteWorker,
  deleteWorkerTransaction,
  erpKeys,
  getAppSettings,
  getWorkerSpecialities,
  getWorker,
  listInvoices,
  listSpecialities,
  listWorkerTransactions,
  updateWorker,
  updateWorkerSpecialities,
  type WorkerTransaction,
} from "@/lib/erp";
import AccountFlowChart from "@/components/finance/AccountFlowChart";
import {
  WorkerTransactionModal,
  getWorkerTransactionModeLabel,
  type WorkerTransactionMode,
} from "@/components/workers/WorkerTransactionModal";
import { formatCurrencyPair, formatDate } from "@/lib/format";
import { toErrorMessage } from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";

type WorkerFormValues = {
  name: string;
  phone?: string;
  notes?: string;
  specialityIds?: number[];
};

function sameIds(left: number[], right: number[]) {
  if (left.length !== right.length) {
    return false;
  }

  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);
  return sortedLeft.every((id, index) => id === sortedRight[index]);
}

function WorkerFormModal({
  worker,
  onClose,
}: {
  worker: { id: number; name: string; phone: string | null; notes: string | null };
  onClose: () => void;
}) {
  const { t } = useLang();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<WorkerFormValues>();
  const { data: specialities = [], isLoading: specialitiesLoading } = useQuery({
    queryKey: erpKeys.specialities,
    queryFn: listSpecialities,
  });
  const { data: workerSpecialities = [] } = useQuery({
    queryKey: erpKeys.workerSpecialities(worker.id),
    queryFn: () => getWorkerSpecialities(worker.id),
  });

  useEffect(() => {
    form.setFieldValue(
      "specialityIds",
      workerSpecialities.map((speciality) => speciality.specialityId),
    );
  }, [form, workerSpecialities]);

  const saveMutation = useMutation({
    mutationFn: async (values: WorkerFormValues) => {
      const payload = {
        name: values.name.trim(),
        role: null,
        category: null,
        phone: values.phone?.trim() || null,
        notes: values.notes?.trim() || null,
      };

      await updateWorker(worker.id, payload);
      await updateWorkerSpecialities(worker.id, values.specialityIds ?? []);
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
          phone: worker.phone ?? "",
          notes: worker.notes ?? "",
        }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item name="name" label={t.name} rules={[{ required: true, message: t.nameRequired }]}>
          <Input placeholder={t.namePlaceholder} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label={t.phone}>
              <Input placeholder={t.phonePlaceholder} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="specialityIds" label={t.specialities}>
          <Select
            allowClear
            mode="multiple"
            loading={specialitiesLoading}
            optionFilterProp="label"
            placeholder={specialities.length ? t.specialitiesPlaceholder : t.noSpecialities}
            showSearch
            options={specialities.map((speciality) => ({
              label: speciality.name,
              value: speciality.id,
            }))}
          />
        </Form.Item>
        <Typography.Text type="secondary" style={{ display: "block", marginTop: -16 }}>
          {t.specialitiesHelp}
        </Typography.Text>
        <Form.Item name="notes" label={t.remarks} style={{ marginTop: 16 }}>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder={t.remarksPlaceholder} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function WorkerSpecialitiesSection({ workerId }: { workerId: number }) {
  const { t } = useLang();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { data: specialities = [], isLoading: specialitiesLoading } = useQuery({
    queryKey: erpKeys.specialities,
    queryFn: listSpecialities,
  });
  const { data: workerSpecialities = [], isLoading: workerSpecialitiesLoading } = useQuery({
    queryKey: erpKeys.workerSpecialities(workerId),
    queryFn: () => getWorkerSpecialities(workerId),
    enabled: Number.isFinite(workerId),
  });
  const savedIds = useMemo(
    () => workerSpecialities.map((speciality) => speciality.specialityId),
    [workerSpecialities],
  );
  const hasChanges = !sameIds(savedIds, selectedIds);

  useEffect(() => {
    setSelectedIds(savedIds);
  }, [savedIds]);

  const saveMutation = useMutation({
    mutationFn: () => updateWorkerSpecialities(workerId, selectedIds),
    onSuccess: async () => {
      await erpInvalidation.workerSpecialities(workerId);
      message.success(t.saved);
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Card
      title={t.specialities}
      extra={
        <Button
          type="primary"
          disabled={!hasChanges}
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {t.save}
        </Button>
      }
    >
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <Select
          allowClear
          mode="multiple"
          loading={specialitiesLoading || workerSpecialitiesLoading}
          optionFilterProp="label"
          placeholder={specialities.length ? t.specialitiesPlaceholder : t.noSpecialities}
          showSearch
          style={{ width: "100%" }}
          value={selectedIds}
          onChange={setSelectedIds}
          options={specialities.map((speciality) => ({
            label: speciality.name,
            value: speciality.id,
          }))}
        />
        <Typography.Text type="secondary">{t.specialitiesHelp}</Typography.Text>
      </Space>
    </Card>
  );
}

export default function WorkerDetail() {
  const { id } = useParams<{ id: string }>();
  const workerId = Number(id);
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<WorkerTransaction | null>(null);
  const [transactionMode, setTransactionMode] = useState<WorkerTransactionMode>("worked_paid");

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
      usd: totals.usd + transaction.totalAmountUsd - transaction.paidAmountUsd,
      iqd: totals.iqd + transaction.totalAmountIqd - transaction.paidAmountIqd,
    }),
    { usd: 0, iqd: 0 },
  );
  const chartEntries = transactionRows.map((transaction) => ({
    id: transaction.id,
    date: transaction.date,
    creditUsd: transaction.totalAmountUsd,
    creditIqd: transaction.totalAmountIqd,
    debitUsd: transaction.paidAmountUsd,
    debitIqd: transaction.paidAmountIqd,
    balanceDeltaUsd: transaction.totalAmountUsd - transaction.paidAmountUsd,
    balanceDeltaIqd: transaction.totalAmountIqd - transaction.paidAmountIqd,
    transactionUsd: transaction.totalAmountUsd - transaction.paidAmountUsd,
    transactionIqd: transaction.totalAmountIqd - transaction.paidAmountIqd,
    buildingName:
      transaction.sourceInvoiceId != null
        ? invoicesById.get(transaction.sourceInvoiceId)?.buildingName ?? t.projectGlobalCost
        : transaction.buildingName ?? transaction.projectName,
  }));
  const creditTotals = transactionRows.reduce(
    (totals, transaction) => ({
      usd: totals.usd + transaction.totalAmountUsd,
      iqd: totals.iqd + transaction.totalAmountIqd,
    }),
    { usd: 0, iqd: 0 },
  );
  const debitTotals = transactionRows.reduce(
    (totals, transaction) => ({
      usd: totals.usd + transaction.paidAmountUsd,
      iqd: totals.iqd + transaction.paidAmountIqd,
    }),
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
          </Space>
          <div>
            <Typography.Text type="secondary">{worker.phone ?? "-"}</Typography.Text>
          </div>
          {worker.notes ? (
            <div>
              <Typography.Text type="secondary">{worker.notes}</Typography.Text>
            </div>
          ) : null}
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
          <div style={{ textAlign: "right" }}>
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
          creditLabel={t.totalAmount}
          dateLabel={t.date}
          debit={debitTotals}
          debitLabel={t.paidAmount}
          empty={!transactionRows.length}
          emptyDescription={t.noTransactions}
          entries={chartEntries}
          exchangeRateIqdPer100Usd={appSettings?.exchangeRateIqdPer100Usd}
          title={t.transactions}
        />
      )}

      <WorkerSpecialitiesSection workerId={worker.id} />

      <Card
        title={t.transactions}
        extra={
          <Space wrap>
            {(["worked", "paid", "worked_paid"] satisfies WorkerTransactionMode[]).map((mode) => (
              <Button
                key={mode}
                type="primary"
                onClick={() => {
                  setSelectedTransaction(null);
                  setTransactionMode(mode);
                  setShowModal(true);
                }}
              >
                {getWorkerTransactionModeLabel(t, mode)}
              </Button>
            ))}
          </Space>
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
          {visibleTransactions.map((transaction) => {
            const balanceDelta = {
              usd: transaction.totalAmountUsd - transaction.paidAmountUsd,
              iqd: transaction.totalAmountIqd - transaction.paidAmountIqd,
            };
            const isPositive = balanceDelta.usd >= 0 && balanceDelta.iqd >= 0;

            return (
            <Card key={transaction.id} size="small">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <Space>
                  {isPositive ? (
                    <TrendingUp size={18} color="#047857" />
                  ) : (
                    <TrendingDown size={18} color="#be123c" />
                  )}
                  <div>
                    <Typography.Text strong>
                      {transaction.description ?? t.transactions}
                    </Typography.Text>
                    <div>
                      <Typography.Text type="secondary">
                        {[formatDate(transaction.date), transaction.projectName, transaction.buildingName].filter(Boolean).join(" | ")}
                      </Typography.Text>
                    </div>
                    <div>
                      <Typography.Text type="secondary">
                        {t.totalAmount}: {formatCurrencyPair({ usd: transaction.totalAmountUsd, iqd: transaction.totalAmountIqd }, { hideZero: true })} | {t.paidAmount}: {formatCurrencyPair({ usd: transaction.paidAmountUsd, iqd: transaction.paidAmountIqd }, { hideZero: true })}
                      </Typography.Text>
                    </div>
                  </div>
                </Space>
                <Space size="small">
                  <Typography.Text strong type={isPositive ? "success" : "danger"}>
                    {isPositive ? "+" : "-"}
                    {formatCurrencyPair(
                      { usd: Math.abs(balanceDelta.usd), iqd: Math.abs(balanceDelta.iqd) },
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
                          setTransactionMode("worked_paid");
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
            );
          })}
        </Space>
      )}

      {showWorkerModal && worker ? (
        <WorkerFormModal
          worker={worker}
          onClose={() => setShowWorkerModal(false)}
        />
      ) : null}

      {showModal && worker ? (
        <WorkerTransactionModal
          mode={transactionMode}
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
