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
  InputNumber,
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
import { Download, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import {
  createIncomeTransaction,
  deleteIncomeTransaction,
  erpKeys,
  listProjects,
  type Currency,
} from "@/lib/erp";
import { useAuth } from "@/lib/auth";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  addContainsSearchFilter,
  addDateRangeFilter,
  addEqualFilter,
  asCurrency,
  asNumber,
  asRecordStatus,
  STANDARD_PAGE_SIZE,
  toErrorMessage,
} from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";

type IncomeRow = {
  id: number | null;
  project_id: number | null;
  project_name: string | null;
  amount: number | null;
  currency: string | null;
  description: string | null;
  date: string | null;
  record_status: string | null;
  created_by_name: string | null;
};

type IncomeFormValues = {
  projectId: number;
  amount: number;
  currency: Currency;
  description?: string;
  date?: string;
};

function buildFilters({
  search,
  projectId,
  currency,
  dateFrom,
  dateTo,
}: {
  search: string;
  projectId: string;
  currency: Currency | "all";
  dateFrom: string;
  dateTo: string;
}) {
  const filters: CrudFilters = [];
  addContainsSearchFilter(filters, ["project_name", "description", "created_by_name"], search);
  addEqualFilter(filters, "project_id", projectId === "all" ? "all" : Number(projectId));
  addEqualFilter(filters, "currency", currency);
  addDateRangeFilter(filters, "date", dateFrom, dateTo);
  return filters;
}

function IncomeModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const { profile } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm<IncomeFormValues>();
  const { data: projects } = useQuery({ queryKey: erpKeys.projects, queryFn: listProjects });

  const createMutation = useMutation({
    mutationFn: (values: IncomeFormValues) =>
      createIncomeTransaction({
        projectId: values.projectId,
        amount: values.amount,
        currency: values.currency,
        description: values.description?.trim() || null,
        date: values.date || null,
      }),
    onSuccess: () => {
      form.resetFields();
      onSaved();
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Modal
      open={open}
      title={t.newIncomeEntry}
      okText={t.create}
      cancelText={t.cancel}
      confirmLoading={createMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<IncomeFormValues>
        form={form}
        layout="vertical"
        initialValues={{ currency: "USD", date: new Date().toISOString().slice(0, 10) }}
        onFinish={(values) => createMutation.mutate(values)}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label={t.user}>
              <Input readOnly value={profile?.fullName ?? profile?.email ?? ""} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="projectId" label={t.projectOption} rules={[{ required: true, message: t.requiredField }]}>
              <Select
                placeholder={t.noneOption}
                options={projects?.map((project) => ({ label: project.name, value: project.id }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="amount" label={t.amount} rules={[{ required: true, message: t.amountRequired }]}>
              <InputNumber min={0.01} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="currency" label={t.currency}>
              <Select options={["USD", "IQD"].map((value) => ({ label: value, value }))} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="date" label={t.date}>
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label={t.description}>
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function Income() {
  const { t } = useLang();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState<Currency | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const search = useDeferredValue(searchInput.trim());
  const { data: projects } = useQuery({ queryKey: erpKeys.projects, queryFn: listProjects });

  const { tableProps, tableQuery, setFilters, setCurrentPage } = useTable<IncomeRow>({
    resource: "app_income_transactions",
    pagination: { pageSize: STANDARD_PAGE_SIZE },
    sorters: {
      initial: [
        { field: "date", order: "desc" },
        { field: "created_at", order: "desc" },
      ],
    },
    syncWithLocation: false,
  });

  useEffect(() => {
    setCurrentPage(1);
    setFilters(buildFilters({ search, projectId: projectFilter, currency: currencyFilter, dateFrom, dateTo }), "replace");
  }, [currencyFilter, dateFrom, dateTo, projectFilter, search, setCurrentPage, setFilters]);

  const deleteMutation = useMutation({
    mutationFn: (income: IncomeRow) => {
      if (income.id == null) {
        throw new Error(t.notFound);
      }

      return deleteIncomeTransaction(income.id);
    },
    onSuccess: () => void tableQuery.refetch(),
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const rows = useMemo(() => tableProps.dataSource ?? [], [tableProps.dataSource]);
  const hasFilters = Boolean(searchInput || dateFrom || dateTo || projectFilter !== "all" || currencyFilter !== "all");

  const columns = useMemo<TableProps<IncomeRow>["columns"]>(
    () => [
      {
        title: t.projectOption,
        dataIndex: "project_name",
        render: (value: string | null, row) => (
          <Space size="small" wrap>
            <Typography.Text strong>{value ?? "-"}</Typography.Text>
            {asRecordStatus(row.record_status) === "deleted" ? <Tag color="red">{t.deleted}</Tag> : null}
          </Space>
        ),
      },
      {
        title: t.amount,
        dataIndex: "amount",
        align: "right",
        render: (value: number | null, row) => (
          <Typography.Text strong type="success">
            {formatCurrency(asNumber(value), asCurrency(row.currency))}
          </Typography.Text>
        ),
      },
      { title: t.currency, dataIndex: "currency", width: 100, render: (value: string | null) => asCurrency(value) },
      { title: t.user, dataIndex: "created_by_name", render: (value: string | null) => value ?? "-" },
      { title: t.description, dataIndex: "description", render: (value: string | null) => value ?? "-" },
      { title: t.date, dataIndex: "date", render: (value: string | null) => formatDate(value) },
      {
        title: "",
        key: "actions",
        align: "right",
        width: 80,
        render: (_, row) =>
          row.id != null && asRecordStatus(row.record_status) === "active" ? (
            <Popconfirm
              title={t.deleteIncomeConfirm}
              okText={t.remove}
              cancelText={t.cancel}
              onConfirm={() => deleteMutation.mutate(row)}
            >
              <Button danger type="text" icon={<Trash2 size={16} />} loading={deleteMutation.isPending} />
            </Popconfirm>
          ) : null,
      },
    ],
    [deleteMutation, t],
  );

  function exportIncome(format: "csv" | "xlsx") {
    const fileBase = t.incomeTitle;
    const exportRows = rows.map((income) => ({
      [t.projectOption]: income.project_name ?? "",
      [t.amount]: asNumber(income.amount),
      [t.currency]: asCurrency(income.currency),
      [t.user]: income.created_by_name ?? "",
      [t.description]: income.description ?? "",
      [t.date]: income.date ?? "",
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
          <Typography.Title level={2} style={{ marginBottom: 4 }}>{t.incomeTitle}</Typography.Title>
          <Typography.Text type="secondary">{t.income_count(tableQuery.data?.total ?? 0)}</Typography.Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<Download size={16} />} disabled={!rows.length} onClick={() => exportIncome("csv")}>CSV</Button>
            <Button icon={<FileSpreadsheet size={16} />} disabled={!rows.length} onClick={() => exportIncome("xlsx")}>
              {t.excel}
            </Button>
            <Button type="primary" icon={<Plus size={16} />} onClick={() => setOpen(true)}>{t.addIncome}</Button>
          </Space>
        </Col>
      </Row>

      <Card size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Input allowClear value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={`${t.search} ${t.income.toLowerCase()}`} />
          </Col>
          <Col xs={24} md={12} lg={4}>
            <Select
              value={projectFilter}
              style={{ width: "100%" }}
              onChange={setProjectFilter}
              options={[{ label: t.allProjects, value: "all" }, ...(projects?.map((p) => ({ label: p.name, value: String(p.id) })) ?? [])]}
            />
          </Col>
          <Col xs={24} md={12} lg={4}>
            <Select<Currency | "all">
              value={currencyFilter}
              style={{ width: "100%" }}
              onChange={setCurrencyFilter}
              options={[{ label: t.allCurrencies, value: "all" }, { label: "USD", value: "USD" }, { label: "IQD", value: "IQD" }]}
            />
          </Col>
          <Col xs={24} md={8} lg={3}>
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </Col>
          <Col xs={24} md={8} lg={3}>
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </Col>
          <Col xs={24} md={8} lg={2}>
            <Button block disabled={!hasFilters} onClick={() => {
              setSearchInput("");
              setProjectFilter("all");
              setCurrencyFilter("all");
              setDateFrom("");
              setDateTo("");
            }}>
              {t.clearFilters}
            </Button>
          </Col>
        </Row>
      </Card>

      {tableQuery.isError ? (
        <Alert
          showIcon
          type="error"
          message={t.incomeTitle}
          description={toErrorMessage(tableQuery.error)}
          action={<Button onClick={() => void tableQuery.refetch()}>{t.retry}</Button>}
        />
      ) : null}

      <Table<IncomeRow>
        {...tableProps}
        rowKey="id"
        columns={columns}
        pagination={tableProps.pagination ? { ...tableProps.pagination, itemRender: undefined, showSizeChanger: false, showTotal: (total) => `${total} ${t.entries.toLowerCase()}` } : false}
      />

      <IncomeModal open={open} onClose={() => setOpen(false)} onSaved={() => void tableQuery.refetch()} />
    </Space>
  );
}
