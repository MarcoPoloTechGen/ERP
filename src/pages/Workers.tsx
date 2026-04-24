import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { CrudFilters } from "@refinedev/core";
import { useTable } from "@refinedev/antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { ChevronRight, Download, FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";
import { createWorker, deleteWorker, erpKeys, listWorkers, updateWorker } from "@/lib/erp";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { formatCurrency } from "@/lib/format";
import {
  addContainsSearchFilter,
  addEqualFilter,
  STANDARD_PAGE_SIZE,
  toErrorMessage,
} from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";

type WorkerRow = {
  id: number;
  name: string;
  role: string | null;
  category: string | null;
  phone: string | null;
  balance: number | null;
  created_at: string | null;
};

type WorkerFormValues = {
  name: string;
  role: string;
  category?: string;
  phone?: string;
};

function buildFilters(search: string, category: string) {
  const filters: CrudFilters = [];
  addContainsSearchFilter(filters, ["name", "role", "category", "phone"], search);
  addEqualFilter(filters, "category", category);
  return filters;
}

function WorkerModal({
  worker,
  onClose,
  onSaved,
}: {
  worker?: WorkerRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<WorkerFormValues>();

  const saveMutation = useMutation({
    mutationFn: async (values: WorkerFormValues) => {
      const payload = {
        name: values.name.trim(),
        role: values.role.trim(),
        category: values.category?.trim() || null,
        phone: values.phone?.trim() || null,
      };

      if (worker) {
        await updateWorker(worker.id, payload);
        return;
      }

      await createWorker(payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.workers }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
      onSaved();
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Modal
      open
      title={worker ? t.editWorker : t.newWorker}
      okText={worker ? t.save : t.create}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<WorkerFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          name: worker?.name ?? "",
          role: worker?.role ?? "",
          category: worker?.category ?? "",
          phone: worker?.phone ?? "",
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

export default function Workers() {
  const { t } = useLang();
  const { message } = App.useApp();
  const [selectedWorker, setSelectedWorker] = useState<WorkerRow | undefined>();
  const [open, setOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput.trim());

  const { tableProps, tableQuery, setFilters, setCurrentPage } = useTable<WorkerRow>({
    resource: "workers",
    pagination: { pageSize: STANDARD_PAGE_SIZE },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: false,
  });

  const { data: allWorkers } = useQuery({
    queryKey: erpKeys.workers,
    queryFn: listWorkers,
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

  const deleteMutation = useMutation({
    mutationFn: (worker: WorkerRow) => deleteWorker(worker.id),
    onSuccess: () => void tableQuery.refetch(),
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const rows = useMemo(() => tableProps.dataSource ?? [], [tableProps.dataSource]);
  const balanceValue = (worker: WorkerRow) => worker.balance ?? 0;
  const hasFilters = Boolean(searchInput || categoryFilter !== "all");
  const columns: TableProps<WorkerRow>["columns"] = [
    {
      title: t.name,
      dataIndex: "name",
      render: (value: string, worker) => (
        <Space size="small" wrap>
          <Typography.Text strong>{value}</Typography.Text>
          {worker.category ? <Tag color="blue">{worker.category}</Tag> : null}
        </Space>
      ),
    },
    { title: t.role, dataIndex: "role", render: (value: string | null) => value ?? "-" },
    { title: t.phone, dataIndex: "phone", render: (value: string | null) => value ?? "-" },
    {
      title: t.balance,
      dataIndex: "balance",
      align: "right",
      render: (_value: number | null, worker) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong type={balanceValue(worker) >= 0 ? "success" : "danger"}>
            {formatCurrency(balanceValue(worker))}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {balanceValue(worker) >= 0 ? t.toReceive : t.owes}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      width: 144,
      render: (_, worker) => (
        <Space size="small">
          <Button
            type="text"
            icon={<Pencil size={16} />}
            onClick={() => {
              setSelectedWorker(worker);
              setOpen(true);
            }}
          />
          <Popconfirm
            title={t.deleteWorkerConfirm}
            okText={t.remove}
            cancelText={t.cancel}
            onConfirm={() => deleteMutation.mutate(worker)}
          >
            <Button danger type="text" icon={<Trash2 size={16} />} loading={deleteMutation.isPending} />
          </Popconfirm>
          <Link href={`/workers/${worker.id}`}>
            <Button type="text" icon={<ChevronRight size={16} />} />
          </Link>
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
      [t.balance]: balanceValue(worker),
      [t.status]: balanceValue(worker) >= 0 ? t.toReceive : t.owes,
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
                setSelectedWorker(undefined);
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
        columns={columns}
        scroll={{ x: 900 }}
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
        <WorkerModal worker={selectedWorker} onClose={() => setOpen(false)} onSaved={() => void tableQuery.refetch()} />
      ) : null}
    </Space>
  );
}
