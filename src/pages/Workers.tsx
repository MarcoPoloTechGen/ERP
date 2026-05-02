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
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type TableProps,
} from "antd";
import { Download, FileSpreadsheet, Plus } from "lucide-react";
import {
  createWorker,
  erpKeys,
  listSpecialities,
  listWorkerBalances,
  listWorkers,
  updateWorkerSpecialities,
  type Speciality,
} from "@/lib/erp";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { formatCurrencyLabel, formatCurrencyPair } from "@/lib/format";
import {
  addContainsSearchFilter,
  addEqualFilter,
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
  balance: number | null;
  balance_usd: number | null;
  balance_iqd: number | null;
  created_at: string | null;
};

type WorkerFormValues = {
  name: string;
  role: string;
  category?: string;
  phone?: string;
  specialityIds?: number[];
};

function buildFilters(search: string, category: string) {
  const filters: CrudFilters = [];
  addContainsSearchFilter(filters, ["name", "role", "category", "phone"], search);
  addEqualFilter(filters, "category", category);
  return filters;
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
        role: values.role.trim(),
        category: values.category?.trim() || null,
        phone: values.phone?.trim() || null,
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
          role: "",
          category: "",
          phone: "",
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
      </Form>
    </Modal>
  );
}

export default function Workers() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput.trim());

  const { tableProps, tableQuery, setFilters, setCurrentPage } = useTable<WorkerRow>({
    resource: "app_workers",
    pagination: { pageSize: STANDARD_PAGE_SIZE },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: false,
  });

  const { data: allWorkers } = useQuery({
    queryKey: erpKeys.workers,
    queryFn: listWorkers,
  });

  const { data: workerBalanceRows } = useQuery({
    queryKey: erpKeys.workerBalances,
    queryFn: listWorkerBalances,
  });

  const categories = useMemo(() => {
    const values = Array.from(
      new Set((allWorkers ?? []).map((worker) => worker.category).filter(Boolean) as string[]),
    );
    return values.sort((left, right) => left.localeCompare(right));
  }, [allWorkers]);

  useEffect(() => {
    setCurrentPage(1);
    setFilters(buildFilters(search, categoryFilter), "replace");
  }, [categoryFilter, search, setCurrentPage, setFilters]);

  const rows = useMemo(() => tableProps.dataSource ?? [], [tableProps.dataSource]);

  const workerBalances = useMemo(() => {
    const balancesByWorker = new Map<number, { usd: number; iqd: number }>();

    for (const balance of workerBalanceRows ?? []) {
      balancesByWorker.set(balance.workerId, { usd: balance.balanceUsd, iqd: balance.balanceIqd });
    }

    return balancesByWorker;
  }, [workerBalanceRows]);

  const workerBalance = (worker: WorkerRow) => workerBalances.get(worker.id) ?? { usd: 0, iqd: 0 };
  const balanceUsdValue = (worker: WorkerRow) => workerBalance(worker).usd;
  const balanceIqdValue = (worker: WorkerRow) => workerBalance(worker).iqd;
  const hasFilters = Boolean(searchInput || categoryFilter !== "all");
  const columns: TableProps<WorkerRow>["columns"] = [
    {
      title: t.name,
      dataIndex: "name",
      responsive: ["xs", "sm", "md", "lg"],
      ellipsis: true,
      minWidth: 120,
      render: (value: string, worker) => (
        <Space size="small" wrap style={{ width: "100%" }}>
          <Typography.Text strong ellipsis>{value}</Typography.Text>
          {worker.category ? <Tag color="blue" style={{ marginLeft: "auto" }}>{worker.category}</Tag> : null}
        </Space>
      ),
    },
    {
      title: t.role,
      dataIndex: "role",
      responsive: ["sm", "md", "lg"],
      ellipsis: true,
      minWidth: 80,
      render: (value: string | null) => <Typography.Text ellipsis>{value ?? "-"}</Typography.Text>,
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
  ];

  function exportWorkers(format: "csv" | "xlsx") {
    const fileBase = t.workersTitle;
    const exportRows = rows.map((worker) => ({
      [t.name]: worker.name,
      [t.role]: worker.role ?? "",
      [t.category]: worker.category ?? "",
      [t.phone]: worker.phone ?? "",
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

      <Card size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Input
              allowClear
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={`${t.search} ${t.workers.toLowerCase()}`}
            />
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Select
              value={categoryFilter}
              style={{ width: "100%" }}
              onChange={setCategoryFilter}
              options={[
                { label: t.allCategories, value: "all" },
                ...categories.map((category) => ({ label: category, value: category })),
              ]}
            />
          </Col>
          <Col xs={24} md={12} lg={4}>
            <Button
              block
              disabled={!hasFilters}
              onClick={() => {
                setSearchInput("");
                setCategoryFilter("all");
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
    </Space>
  );
}
