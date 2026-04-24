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
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type TableProps,
} from "antd";
import FinanceFilters from "@/components/finance/FinanceFilters";
import FinancePageHeader from "@/components/finance/FinancePageHeader";
import FinanceRowActions from "@/components/finance/FinanceRowActions";
import { standardPagination } from "@/components/finance/table";
import {
  createIncomeTransaction,
  deleteIncomeTransaction,
  erpKeys,
  listIncomeTransactionHistory,
  listProjects,
  updateIncomeTransaction,
  type Currency,
  type IncomeTransactionHistoryAction,
  type IncomeTransactionHistoryEntry,
} from "@/lib/erp";
import { useAuth } from "@/lib/auth";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { formatCurrency, formatDate, formatDateInput, formatDateTime } from "@/lib/format";
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
  income,
  open,
  onClose,
  onSaved,
}: {
  income: IncomeRow | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const { profile } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm<IncomeFormValues>();
  const { data: projects } = useQuery({ queryKey: erpKeys.projects, queryFn: listProjects });

  const saveMutation = useMutation({
    mutationFn: (values: IncomeFormValues) => {
      const payload = {
        projectId: values.projectId,
        amount: values.amount,
        currency: values.currency,
        description: values.description?.trim() || null,
        date: values.date || null,
      };

      if (income) {
        if (income.id == null) {
          throw new Error(t.notFound);
        }

        return updateIncomeTransaction(income.id, payload);
      }

      return createIncomeTransaction(payload);
    },
    onSuccess: () => {
      form.resetFields();
      onSaved();
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    form.setFieldsValue({
      projectId: income?.project_id ?? undefined,
      amount: income?.amount ?? undefined,
      currency: asCurrency(income?.currency),
      description: income?.description ?? "",
      date: formatDateInput(income?.date) || new Date().toISOString().slice(0, 10),
    });
  }, [form, income, open]);

  return (
    <Modal
      open={open}
      title={income ? t.editIncomeEntry : t.newIncomeEntry}
      okText={income ? t.save : t.create}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<IncomeFormValues>
        form={form}
        layout="vertical"
        initialValues={{ currency: "USD", date: new Date().toISOString().slice(0, 10) }}
        onFinish={(values) => saveMutation.mutate(values)}
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
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<IncomeRow | null>(null);
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

  const historyQuery = useQuery({
    queryKey: erpKeys.incomeHistory,
    queryFn: listIncomeTransactionHistory,
  });

  function refetchIncomeData() {
    void tableQuery.refetch();
    void historyQuery.refetch();
  }

  const deleteMutation = useMutation({
    mutationFn: (income: IncomeRow) => {
      if (income.id == null) {
        throw new Error(t.notFound);
      }

      return deleteIncomeTransaction(income.id);
    },
    onSuccess: refetchIncomeData,
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
        width: 120,
        render: (_, row) =>
          row.id != null ? (
            <FinanceRowActions
              active={asRecordStatus(row.record_status) === "active"}
              cancelLabel={t.cancel}
              deleteLoading={deleteMutation.isPending}
              deleteTitle={t.deleteIncomeConfirm}
              removeLabel={t.remove}
              onDelete={() => deleteMutation.mutate(row)}
              onEdit={() => {
                setSelectedIncome(row);
                setModalOpen(true);
              }}
            />
          ) : null,
      },
    ],
    [deleteMutation, t],
  );

  const historyColumns = useMemo<TableProps<IncomeTransactionHistoryEntry>["columns"]>(
    () => [
      { title: t.changeDate, dataIndex: "changedAt", render: (value: string | null) => formatDateTime(value) },
      { title: t.user, dataIndex: "changedByName", render: (value: string | null) => value ?? "-" },
      {
        title: t.changeType,
        dataIndex: "action",
        render: (value: IncomeTransactionHistoryAction) => {
          const color = value === "deleted" ? "red" : value === "updated" ? "orange" : "green";
          const label =
            value === "deleted" ? t.changeDeleted : value === "updated" ? t.changeUpdated : t.changeCreated;
          return <Tag color={color}>{label}</Tag>;
        },
      },
      { title: t.projectOption, dataIndex: "projectName", render: (value: string | null) => value ?? "-" },
      {
        title: t.amount,
        dataIndex: "amount",
        align: "right",
        render: (value: number, row) => formatCurrency(value, row.currency),
      },
      { title: t.currency, dataIndex: "currency" },
      { title: t.date, dataIndex: "date", render: (value: string | null) => formatDate(value) },
      { title: t.description, dataIndex: "description", render: (value: string | null) => value ?? "-" },
    ],
    [t],
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
      <FinancePageHeader
        addLabel={t.addIncome}
        countText={t.income_count(tableQuery.data?.total ?? 0)}
        excelLabel={t.excel}
        rowsLength={rows.length}
        title={t.incomeTitle}
        onAdd={() => {
          setSelectedIncome(null);
          setModalOpen(true);
        }}
        onExportCsv={() => exportIncome("csv")}
        onExportExcel={() => exportIncome("xlsx")}
      />

      <FinanceFilters
        allCurrenciesLabel={t.allCurrencies}
        allProjectsLabel={t.allProjects}
        clearLabel={t.clearFilters}
        currencyValue={currencyFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        hasFilters={hasFilters}
        projectValue={projectFilter}
        projects={projects}
        searchPlaceholder={`${t.search} ${t.income.toLowerCase()}`}
        searchValue={searchInput}
        onClear={() => {
          setSearchInput("");
          setProjectFilter("all");
          setCurrencyFilter("all");
          setDateFrom("");
          setDateTo("");
        }}
        onCurrencyChange={setCurrencyFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onProjectChange={setProjectFilter}
        onSearchChange={setSearchInput}
      />

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
        pagination={standardPagination(tableProps.pagination, (total) => `${total} ${t.entries.toLowerCase()}`)}
      />

      <Card title={t.incomeLog}>
        {historyQuery.isError ? (
          <Alert
            showIcon
            type="error"
            message={t.incomeLog}
            description={toErrorMessage(historyQuery.error)}
            action={<Button onClick={() => void historyQuery.refetch()}>{t.retry}</Button>}
          />
        ) : (
          <Table<IncomeTransactionHistoryEntry>
            rowKey="id"
            size="small"
            loading={historyQuery.isLoading}
            dataSource={historyQuery.data ?? []}
            columns={historyColumns}
            scroll={{ x: 1000 }}
            locale={{ emptyText: t.noIncomeLog }}
            pagination={{ pageSize: STANDARD_PAGE_SIZE, showSizeChanger: false }}
          />
        )}
      </Card>

      {modalOpen ? (
        <IncomeModal
          income={selectedIncome}
          open
          onClose={() => {
            setModalOpen(false);
            setSelectedIncome(null);
          }}
          onSaved={refetchIncomeData}
        />
      ) : null}
    </Space>
  );
}
