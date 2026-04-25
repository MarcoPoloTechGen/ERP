import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { CrudFilters } from "@refinedev/core";
import { useTable } from "@refinedev/antd";
import { useMutation } from "@tanstack/react-query";
import {
  App,
  Alert,
  Button,
  Card,
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
import { IncomeModal } from "@/components/income/IncomeModal";
import type { IncomeRow } from "@/components/income/income-shared";
import {
  deleteIncomeTransaction,
  type Currency,
  type IncomeTransactionHistoryAction,
  type IncomeTransactionHistoryEntry,
} from "@/lib/erp";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { formatCurrencyLabel, formatCurrencyPair, formatDate, formatDateTime } from "@/lib/format";
import {
  addContainsSearchFilter,
  addCurrencyAmountFilter,
  addDateRangeFilter,
  addEqualFilter,
  asNumber,
  asRecordStatus,
  STANDARD_PAGE_SIZE,
  toErrorMessage,
} from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";
import { useIncomeTransactionHistory } from "@/hooks/use-income";
import { useProjects } from "@/hooks/use-projects";

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
  addCurrencyAmountFilter(filters, currency, { USD: "amount_usd", IQD: "amount_iqd" });
  addDateRangeFilter(filters, "date", dateFrom, dateTo);
  return filters;
}

export default function Income() {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<IncomeRow | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState<Currency | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const search = useDeferredValue(searchInput.trim());
  const effectiveProjectFilter = scopedProjectId == null ? projectFilter : String(scopedProjectId);
  const { data: projects } = useProjects();

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
    setFilters(buildFilters({ search, projectId: effectiveProjectFilter, currency: currencyFilter, dateFrom, dateTo }), "replace");
  }, [currencyFilter, dateFrom, dateTo, effectiveProjectFilter, search, setCurrentPage, setFilters]);

  const historyQuery = useIncomeTransactionHistory();

  function refetchIncomeData() {
    void erpInvalidation.income();
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
  const historyRows = useMemo(
    () =>
      scopedProjectId == null
        ? (historyQuery.data ?? [])
        : (historyQuery.data ?? []).filter((entry) => entry.projectId === scopedProjectId),
    [historyQuery.data, scopedProjectId],
  );
  const hasFilters = Boolean(
    searchInput || dateFrom || dateTo || (scopedProjectId == null && projectFilter !== "all") || currencyFilter !== "all",
  );

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
        dataIndex: "amount_usd",
        align: "right",
        render: (_value: number | null, row) => (
          <Typography.Text strong type="success">
            {formatCurrencyPair({ usd: row.amount_usd, iqd: row.amount_iqd })}
          </Typography.Text>
        ),
      },
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
        dataIndex: "amountUsd",
        align: "right",
        render: (_value: number, row) => formatCurrencyPair({ usd: row.amountUsd, iqd: row.amountIqd }),
      },
      { title: t.date, dataIndex: "date", render: (value: string | null) => formatDate(value) },
      { title: t.description, dataIndex: "description", render: (value: string | null) => value ?? "-" },
    ],
    [t],
  );

  function exportIncome(format: "csv" | "xlsx") {
    const fileBase = t.incomeTitle;
    const exportRows = rows.map((income) => ({
      [t.projectOption]: income.project_name ?? "",
      [`${t.amount} ${formatCurrencyLabel("USD")}`]: asNumber(income.amount_usd),
      [`${t.amount} IQD`]: asNumber(income.amount_iqd),
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
        projectDisabled={scopedProjectId != null}
        projectValue={effectiveProjectFilter}
        projects={projects}
        searchPlaceholder={`${t.search} ${t.income.toLowerCase()}`}
        searchValue={searchInput}
        onClear={() => {
          setSearchInput("");
          setProjectFilter(scopedProjectId == null ? "all" : String(scopedProjectId));
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
            dataSource={historyRows}
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
