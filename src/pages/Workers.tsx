import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { CrudFilters } from "@refinedev/core";
import { useTable } from "@refinedev/antd";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  App,
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type TableProps,
} from "antd";
import { Download, FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createSpeciality,
  createWorker,
  deleteSpeciality,
  erpKeys,
  listWorkerSpecialitiesByWorker,
  listSpecialities,
  listWorkerBalances,
  updateSpeciality,
  updateWorkerSpecialities,
  type Speciality,
} from "@/lib/erp";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import {
  WorkerTransactionModal,
  getWorkerTransactionModeLabel,
  type WorkerTransactionMode,
} from "@/components/workers/WorkerTransactionModal";
import { formatCurrencyLabel, formatCurrencyPair } from "@/lib/format";
import {
  addContainsSearchFilter,
  STANDARD_PAGE_SIZE,
  toErrorMessage,
} from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";

type WorkerRow = {
  id: number;
  name: string;
  role: string | null;
  category: string | null;
  phone: string | null;
  notes: string | null;
  balance: number | null;
  balance_usd: number | null;
  balance_iqd: number | null;
  created_at: string | null;
};

type WorkerFormValues = {
  name: string;
  phone?: string;
  notes?: string;
  specialityIds?: number[];
};

type SpecialityFormValues = {
  name: string;
};

function buildFilters(search: string) {
  const filters: CrudFilters = [];
  addContainsSearchFilter(filters, ["name", "phone", "notes"], search);
  return filters;
}

function SpecialityModal({
  speciality,
  onClose,
}: {
  speciality?: Speciality;
  onClose: () => void;
}) {
  const { t } = useLang();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<SpecialityFormValues>();

  const saveMutation = useMutation({
    mutationFn: (values: SpecialityFormValues) =>
      speciality ? updateSpeciality(speciality.id, values.name) : createSpeciality(values.name),
    onSuccess: async () => {
      await erpInvalidation.specialities();
      message.success(t.saved);
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Modal
      open
      title={speciality ? t.editSpeciality : t.addSpeciality}
      okText={speciality ? t.save : t.create}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<SpecialityFormValues>
        form={form}
        layout="vertical"
        initialValues={{ name: speciality?.name ?? "" }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item name="name" label={t.specialityName} rules={[{ required: true, message: t.requiredField }]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function SpecialitiesManager() {
  const { t } = useLang();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [editedSpeciality, setEditedSpeciality] = useState<Speciality | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { data: specialities = [], isLoading } = useQuery({
    queryKey: erpKeys.specialities,
    queryFn: listSpecialities,
  });

  const deleteMutation = useMutation({
    mutationFn: (speciality: Speciality) => deleteSpeciality(speciality.id),
    onSuccess: async () => {
      await erpInvalidation.specialities();
      message.success(t.deleted);
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Card
      size="small"
      title={t.manageSpecialities}
      extra={
        <Button
          icon={<Plus size={16} />}
          onClick={() => {
            setEditedSpeciality(null);
            setShowModal(true);
          }}
        >
          {t.addSpeciality}
        </Button>
      }
    >
      {isLoading ? (
        <Typography.Text type="secondary">{t.loading}</Typography.Text>
      ) : specialities.length ? (
        <Space wrap>
          {specialities.map((speciality) => (
            <Tag key={speciality.id} style={{ alignItems: "center", display: "inline-flex", gap: 4, padding: "4px 6px" }}>
              <span>{speciality.name}</span>
              <Button
                aria-label={t.editSpeciality}
                icon={<Pencil size={12} />}
                size="small"
                type="text"
                onClick={() => {
                  setEditedSpeciality(speciality);
                  setShowModal(true);
                }}
              />
              <Popconfirm
                title={t.deleteSpecialityConfirm}
                okText={t.remove}
                cancelText={t.cancel}
                onConfirm={() => deleteMutation.mutate(speciality)}
              >
                <Button
                  aria-label={t.remove}
                  danger
                  icon={<Trash2 size={12} />}
                  loading={deleteMutation.isPending}
                  size="small"
                  type="text"
                />
              </Popconfirm>
            </Tag>
          ))}
        </Space>
      ) : (
        <Typography.Text type="secondary">{t.noSpecialities}</Typography.Text>
      )}

      {showModal ? (
        <SpecialityModal
          speciality={editedSpeciality ?? undefined}
          onClose={() => {
            setShowModal(false);
            setEditedSpeciality(null);
          }}
        />
      ) : null}
    </Card>
  );
}

function WorkerModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<WorkerFormValues>();
  const { data: specialities = [], isLoading: specialitiesLoading } = useQuery({
    queryKey: erpKeys.specialities,
    queryFn: listSpecialities,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: WorkerFormValues) => {
      const payload = {
        name: values.name.trim(),
        role: null,
        category: null,
        phone: values.phone?.trim() || null,
        notes: values.notes?.trim() || null,
      };

      const workerId = await createWorker(payload);
      if (values.specialityIds?.length) {
        await updateWorkerSpecialities(workerId, values.specialityIds);
      }
    },
    onSuccess: async () => {
      await erpInvalidation.workers();
      onSaved();
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Modal
      open
      title={t.newWorker}
      okText={t.create}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<WorkerFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          name: "",
          phone: "",
          notes: "",
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
          <Select<number, { label: string; value: number }>
            allowClear
            mode="multiple"
            loading={specialitiesLoading}
            optionFilterProp="label"
            placeholder={specialities.length ? t.specialitiesPlaceholder : t.noSpecialities}
            showSearch
            options={specialities.map((speciality: Speciality) => ({
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

export default function Workers() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [transactionTarget, setTransactionTarget] = useState<{ worker: WorkerRow; mode: WorkerTransactionMode } | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput.trim());

  const { tableProps, tableQuery, setFilters, setCurrentPage } = useTable<WorkerRow>({
    resource: "app_workers",
    pagination: { pageSize: STANDARD_PAGE_SIZE },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: false,
  });

  const { data: workerBalanceRows } = useQuery({
    queryKey: erpKeys.workerBalances,
    queryFn: listWorkerBalances,
  });

  useEffect(() => {
    setCurrentPage(1);
    setFilters(buildFilters(search), "replace");
  }, [search, setCurrentPage, setFilters]);

  const rows = useMemo(() => tableProps.dataSource ?? [], [tableProps.dataSource]);
  const workerIds = useMemo(
    () => Array.from(new Set(rows.map((worker) => worker.id).filter((id) => Number.isFinite(id)))),
    [rows],
  );

  const workerBalances = useMemo(() => {
    const balancesByWorker = new Map<number, { usd: number; iqd: number }>();

    for (const balance of workerBalanceRows ?? []) {
      balancesByWorker.set(balance.workerId, { usd: balance.balanceUsd, iqd: balance.balanceIqd });
    }

    return balancesByWorker;
  }, [workerBalanceRows]);

  const { data: workerSpecialitiesByWorker = {} } = useQuery({
    queryKey: [...erpKeys.workerSpecialitiesList, workerIds],
    queryFn: () => listWorkerSpecialitiesByWorker(workerIds),
    enabled: workerIds.length > 0,
  });

  const workerBalance = (worker: WorkerRow) => workerBalances.get(worker.id) ?? { usd: 0, iqd: 0 };
  const balanceUsdValue = (worker: WorkerRow) => workerBalance(worker).usd;
  const balanceIqdValue = (worker: WorkerRow) => workerBalance(worker).iqd;
  const hasFilters = Boolean(searchInput);
  const columns: TableProps<WorkerRow>["columns"] = [
    {
      title: t.name,
      dataIndex: "name",
      responsive: ["xs", "sm", "md", "lg"],
      ellipsis: true,
      minWidth: 120,
      render: (value: string, worker) => (
        <Space direction="vertical" size={2} style={{ width: "100%" }}>
          <Typography.Text strong ellipsis>
            {value}
          </Typography.Text>
          {workerSpecialitiesByWorker[worker.id]?.length ? (
            <Space size={[4, 4]} wrap>
              {workerSpecialitiesByWorker[worker.id].map((speciality) => (
                <Tag key={speciality.specialityId} style={{ marginInlineEnd: 0 }}>
                  {speciality.name}
                </Tag>
              ))}
            </Space>
          ) : null}
        </Space>
      ),
    },
    {
      title: t.phone,
      dataIndex: "phone",
      responsive: ["md", "lg"],
      ellipsis: true,
      minWidth: 100,
      render: (value: string | null) => <Typography.Text ellipsis>{value ?? "-"}</Typography.Text>,
    },
    {
      title: t.balance,
      dataIndex: "balance",
      align: "right",
      responsive: ["xs", "sm", "md", "lg"],
      ellipsis: true,
      width: 130,
      render: (_value: number | null, worker) => (
        <Space direction="vertical" size={0}>
          <Typography.Text
            strong
            type={balanceUsdValue(worker) >= 0 && balanceIqdValue(worker) >= 0 ? "success" : "danger"}
          >
            {formatCurrencyPair({ usd: balanceUsdValue(worker), iqd: balanceIqdValue(worker) })}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {balanceUsdValue(worker) >= 0 && balanceIqdValue(worker) >= 0 ? t.toReceive : t.owes}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      width: 390,
      render: (_value, worker) => (
        <Space
          size="small"
          wrap
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {(["worked", "paid", "worked_paid"] satisfies WorkerTransactionMode[]).map((mode) => (
            <Button
              key={mode}
              size="small"
              icon={<Plus size={14} />}
              onClick={() => setTransactionTarget({ worker, mode })}
            >
              {getWorkerTransactionModeLabel(t, mode)}
            </Button>
          ))}
        </Space>
      ),
    },
  ];

  function exportWorkers(format: "csv" | "xlsx") {
    const fileBase = t.workersTitle;
    const exportRows = rows.map((worker) => ({
      [t.name]: worker.name,
      [t.phone]: worker.phone ?? "",
      [t.remarks]: worker.notes ?? "",
      [`${t.balance} ${formatCurrencyLabel("USD")}`]: balanceUsdValue(worker),
      [`${t.balance} IQD`]: balanceIqdValue(worker),
      [t.status]: balanceUsdValue(worker) >= 0 && balanceIqdValue(worker) >= 0 ? t.toReceive : t.owes,
    }));

    if (format === "csv") {
      exportRowsToCsv(`${fileBase}.csv`, exportRows);
      return;
    }

    exportRowsToExcel(`${fileBase}.xlsx`, fileBase, exportRows);
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Row align="bottom" gutter={[16, 16]} justify="space-between">
        <Col>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            {t.workersTitle}
          </Typography.Title>
          <Typography.Text type="secondary">{t.worker_count(tableQuery.data?.total ?? 0)}</Typography.Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<Download size={16} />} disabled={!rows.length} onClick={() => exportWorkers("csv")}>
              CSV
            </Button>
            <Button icon={<FileSpreadsheet size={16} />} disabled={!rows.length} onClick={() => exportWorkers("xlsx")}>
              {t.excel}
            </Button>
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                setOpen(true);
              }}
            >
              {t.addWorker}
            </Button>
          </Space>
        </Col>
      </Row>

      <SpecialitiesManager />

      <Card size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={18} lg={20}>
            <Input
              allowClear
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={`${t.search} ${t.workers.toLowerCase()}`}
            />
          </Col>
          <Col xs={24} md={6} lg={4}>
            <Button
              block
              disabled={!hasFilters}
              onClick={() => {
                setSearchInput("");
              }}
            >
              {t.clearFilters}
            </Button>
          </Col>
        </Row>
      </Card>

      {tableQuery.isError ? (
        <Alert
          showIcon
          type="error"
          message={t.notFound}
          description={toErrorMessage(tableQuery.error)}
          action={<Button onClick={() => void tableQuery.refetch()}>{t.retry}</Button>}
        />
      ) : null}

      <Table<WorkerRow>
        {...tableProps}
        rowKey="id"
        size="small"
        columns={columns}
        scroll={{ x: true }}
        onRow={(worker) => ({
          onClick: () => window.location.href = `/workers/${worker.id}`,
          style: { cursor: "pointer" },
        })}
        pagination={
          tableProps.pagination
            ? {
                ...tableProps.pagination,
                itemRender: undefined,
                showSizeChanger: false,
                showTotal: (total) => `${total} ${t.workers.toLowerCase()}`,
              }
            : false
        }
      />

      {open ? (
        <WorkerModal onClose={() => setOpen(false)} onSaved={() => void tableQuery.refetch()} />
      ) : null}

      {transactionTarget ? (
        <WorkerTransactionModal
          mode={transactionTarget.mode}
          workerId={transactionTarget.worker.id}
          onClose={() => setTransactionTarget(null)}
          onSaved={() => void tableQuery.refetch()}
        />
      ) : null}
    </Space>
  );
}
