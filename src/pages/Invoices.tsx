import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { CrudFilters } from "@refinedev/core";
import { useTable } from "@refinedev/antd";
import { useMutation } from "@tanstack/react-query";
import {
  App,
  Alert,
  Button,
  Segmented,
  Image as AntImage,
  Space,
  Table,
  Tag,
  Typography,
  type TableProps,
} from "antd";
import FinanceFilters from "@/components/finance/FinanceFilters";
import FinancePageHeader from "@/components/finance/FinancePageHeader";
import FinanceRowActions from "@/components/finance/FinanceRowActions";
import ProjectExpenseVisualization from "@/components/finance/ProjectExpenseVisualization";
import { standardPagination } from "@/components/finance/table";
import { IncomeModal } from "@/components/income/IncomeModal";
import { InvoiceModal } from "@/components/invoices/InvoiceModal";
import {
  expenseTypeLabel,
  invoiceStatusColor,
  invoiceStatusLabel,
  type InvoiceRow,
} from "@/components/invoices/invoice-shared";
import {
  deleteInvoice,
  type Currency,
  type InvoiceStatus,
} from "@/lib/erp";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import type { ExpenseAssignment } from "@/lib/expense-assignment";
import { asExpenseType } from "@/lib/expense-types";
import { formatCurrencyLabel, formatCurrencyPair, formatDate, formatDateInput } from "@/lib/format";
import {
  addContainsSearchFilter,
  addCurrencyAmountFilter,
  addDateRangeFilter,
  addEqualFilter,
  asDualCurrencyInvoiceStatus,
  asNumber,
  asRecordStatus,
  STANDARD_PAGE_SIZE,
  toErrorMessage,
} from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";
import { useInvoices } from "@/hooks/use-invoices";
import { useProjectBuildings, useProjects } from "@/hooks/use-projects";
import { useSuppliers } from "@/hooks/use-suppliers";
import {
  createSignedInvoiceImageUrls,
  resolveInvoiceImagePath,
} from "@/lib/supabase";

function buildFilters({
  search,
  status,
  projectId,
  supplierId,
  currency,
  dateFrom,
  dateTo,
}: {
  search: string;
  status: InvoiceStatus | "all";
  projectId: string;
  supplierId: string;
  currency: Currency | "all";
  dateFrom: string;
  dateTo: string;
}) {
  const filters: CrudFilters = [];
  addContainsSearchFilter(
    filters,
    [
      "number",
      "expense_type",
      "labor_worker_name",
      "labor_person_name",
      "supplier_name",
      "project_name",
      "building_name",
      "product_name",
      "created_by_name",
      "notes",
    ],
    search,
  );
  addEqualFilter(filters, "status", status);
  addEqualFilter(filters, "project_id", projectId === "all" ? "all" : Number(projectId));
  addEqualFilter(filters, "supplier_id", supplierId === "all" ? "all" : Number(supplierId));
  addCurrencyAmountFilter(filters, currency, { USD: "total_amount_usd", IQD: "total_amount_iqd" });
  addDateRangeFilter(filters, "invoice_date", dateFrom, dateTo);
  return filters;
}

export default function Invoices() {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | undefined>();
  const [initialInvoiceAssignment, setInitialInvoiceAssignment] = useState<ExpenseAssignment | undefined>();
  const [buildingTransactionKind, setBuildingTransactionKind] = useState<"expense" | "income">("expense");
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [visualizationProjectId, setVisualizationProjectId] = useState<number | null>(null);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState<Currency | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [imageUrlsByPath, setImageUrlsByPath] = useState(new Map<string, string>());
  const search = useDeferredValue(searchInput.trim());
  const effectiveProjectFilter = scopedProjectId == null ? projectFilter : String(scopedProjectId);

  const { data: projects } = useProjects();
  const { data: suppliers } = useSuppliers();
  const allInvoicesQuery = useInvoices();

  useEffect(() => {
    if (!projects?.length) {
      setVisualizationProjectId(null);
      return;
    }

    if (scopedProjectId != null) {
      setVisualizationProjectId(scopedProjectId);
      return;
    }

    if (visualizationProjectId == null || !projects.some((project) => project.id === visualizationProjectId)) {
      setVisualizationProjectId(projects[0].id);
    }
  }, [projects, scopedProjectId, visualizationProjectId]);

  const selectedVisualizationProjectId = visualizationProjectId;
  const visualizationBuildingsQuery = useProjectBuildings(
    selectedVisualizationProjectId,
    selectedVisualizationProjectId != null,
  );

  const { tableProps, tableQuery, setFilters, setCurrentPage } = useTable<InvoiceRow>({
    resource: "app_invoices",
    pagination: { pageSize: STANDARD_PAGE_SIZE },
    sorters: {
      initial: [
        { field: "invoice_date", order: "desc" },
        { field: "created_at", order: "desc" },
      ],
    },
    syncWithLocation: false,
  });

  useEffect(() => {
    setCurrentPage(1);
    setFilters(
      buildFilters({
        search,
        status: statusFilter,
        projectId: effectiveProjectFilter,
        supplierId: supplierFilter,
        currency: currencyFilter,
        dateFrom,
        dateTo,
      }),
      "replace",
    );
  }, [currencyFilter, dateFrom, dateTo, effectiveProjectFilter, search, setCurrentPage, setFilters, statusFilter, supplierFilter]);

  const deleteMutation = useMutation({
    mutationFn: (invoice: InvoiceRow) => {
      if (invoice.id == null) {
        throw new Error(t.notFound);
      }

      return deleteInvoice(invoice.id);
    },
    onSuccess: async () => {
      await erpInvalidation.invoices();
      void tableQuery.refetch();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const rows = useMemo(() => tableProps.dataSource ?? [], [tableProps.dataSource]);
  const imagePathKey = rows.map((invoice) => invoice.image_path ?? "").join("|");

  useEffect(() => {
    let cancelled = false;

    async function loadSignedImages() {
      try {
        const urls = await createSignedInvoiceImageUrls(rows.map((invoice) => invoice.image_path));
        if (!cancelled) {
          setImageUrlsByPath(urls);
        }
      } catch (error) {
        if (!cancelled) {
          void message.error(toErrorMessage(error));
        }
      }
    }

    void loadSignedImages();
    return () => {
      cancelled = true;
    };
  }, [imagePathKey, message, rows]);

  const hasFilters = Boolean(
    searchInput ||
      statusFilter !== "all" ||
      (scopedProjectId == null && projectFilter !== "all") ||
      supplierFilter !== "all" ||
      currencyFilter !== "all" ||
      dateFrom ||
      dateTo,
  );

  function imageUrlFor(invoice: InvoiceRow) {
    const path = resolveInvoiceImagePath(invoice.image_path);
    return path ? imageUrlsByPath.get(path) ?? null : null;
  }

  const columns: TableProps<InvoiceRow>["columns"] = [
    {
      title: t.expenseTitle,
      dataIndex: "number",
      render: (value: string, invoice) => {
        const imageUrl = imageUrlFor(invoice);
        return (
          <Space>
            {imageUrl ? (
              <AntImage
                width={48}
                height={48}
                src={imageUrl}
                alt={t.receiptImage}
                style={{ objectFit: "cover", borderRadius: 6 }}
              />
            ) : null}
            <Space direction="vertical" size={0}>
              <Space size="small" wrap>
                <Typography.Text strong>{value ?? "-"}</Typography.Text>
                <Tag
                  color={
                    invoiceStatusColor[
                      asDualCurrencyInvoiceStatus(
                        invoice.status,
                        asNumber(invoice.total_amount_usd),
                        asNumber(invoice.paid_amount_usd),
                        asNumber(invoice.total_amount_iqd),
                        asNumber(invoice.paid_amount_iqd),
                      )
                    ]
                  }
                >
                  {invoiceStatusLabel(
                    asDualCurrencyInvoiceStatus(
                      invoice.status,
                      asNumber(invoice.total_amount_usd),
                      asNumber(invoice.paid_amount_usd),
                      asNumber(invoice.total_amount_iqd),
                      asNumber(invoice.paid_amount_iqd),
                    ),
                    t,
                  )}
                </Tag>
                {asRecordStatus(invoice.record_status) === "deleted" ? <Tag>{t.deleted}</Tag> : null}
              </Space>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {[
                  expenseTypeLabel(asExpenseType(invoice.expense_type), t),
                  invoice.labor_worker_name ?? invoice.labor_person_name,
                  invoice.supplier_name,
                  invoice.project_name,
                  invoice.product_name,
                ].filter(Boolean).join(" | ") ||
                  t.noDetail}
              </Typography.Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: t.invoiceAssignment,
      dataIndex: "building_name",
      render: (value: string | null) => (value ? t.projectBuildingCost : t.projectGlobalCost),
    },
    { title: t.user, dataIndex: "created_by_name", render: (value: string | null) => value ?? "-" },
    {
      title: t.totalAmount,
      dataIndex: "total_amount_usd",
      align: "right",
      render: (_value: number | null, invoice) =>
        formatCurrencyPair({ usd: invoice.total_amount_usd, iqd: invoice.total_amount_iqd }),
    },
    {
      title: t.remaining_label,
      dataIndex: "remaining_amount_usd",
      align: "right",
      render: (_value: number | null, invoice) =>
        formatCurrencyPair({ usd: invoice.remaining_amount_usd, iqd: invoice.remaining_amount_iqd }),
    },
    { title: t.invoiceDate, dataIndex: "invoice_date", render: (value: string | null) => formatDate(value) },
    {
      title: "",
      key: "actions",
      align: "right",
      width: 144,
      render: (_, invoice) => (
        <FinanceRowActions
          active={invoice.id != null && asRecordStatus(invoice.record_status) === "active"}
          cancelLabel={t.cancel}
          deleteLoading={deleteMutation.isPending}
          deleteTitle={t.deleteInvoiceConfirm}
          detailHref={invoice.id != null ? `/expenses/${invoice.id}` : undefined}
          removeLabel={t.remove}
          onDelete={() => deleteMutation.mutate(invoice)}
          onEdit={() => {
            setSelectedInvoice(invoice);
            setInitialInvoiceAssignment(undefined);
            setBuildingTransactionKind("expense");
            setOpen(true);
          }}
        />
      ),
    },
  ];

  function exportInvoices(format: "csv" | "xlsx") {
    const fileBase = t.invoicesTitle;
    const exportRows = rows.map((invoice) => ({
      [t.expenseTitle]: invoice.number ?? "",
      [t.expenseType]: expenseTypeLabel(asExpenseType(invoice.expense_type), t),
      [t.laborPersonName]: invoice.labor_worker_name ?? invoice.labor_person_name ?? "",
      [t.status]: invoiceStatusLabel(
        asDualCurrencyInvoiceStatus(
          invoice.status,
          asNumber(invoice.total_amount_usd),
          asNumber(invoice.paid_amount_usd),
          asNumber(invoice.total_amount_iqd),
          asNumber(invoice.paid_amount_iqd),
        ),
        t,
      ),
      [t.invoiceAssignment]: invoice.building_name ? t.projectBuildingCost : t.projectGlobalCost,
      [t.buildingLabel]: invoice.building_name ?? "",
      [t.supplierOption]: invoice.supplier_name ?? "",
      [t.products]: invoice.product_name ?? "",
      [t.projectOption]: invoice.project_name ?? "",
      [t.createdBy]: invoice.created_by_name ?? "",
      [`${t.totalAmount} ${formatCurrencyLabel("USD")}`]: asNumber(invoice.total_amount_usd),
      [`${t.paidAmount} ${formatCurrencyLabel("USD")}`]: asNumber(invoice.paid_amount_usd),
      [`${t.remaining_label} ${formatCurrencyLabel("USD")}`]: asNumber(invoice.remaining_amount_usd),
      [`${t.totalAmount} IQD`]: asNumber(invoice.total_amount_iqd),
      [`${t.paidAmount} IQD`]: asNumber(invoice.paid_amount_iqd),
      [`${t.remaining_label} IQD`]: asNumber(invoice.remaining_amount_iqd),
      [t.invoiceDate]: formatDateInput(invoice.invoice_date),
      [t.dueDate]: formatDateInput(invoice.due_date),
      [t.notes]: invoice.notes ?? "",
    }));

    if (format === "csv") {
      exportRowsToCsv(`${fileBase}.csv`, exportRows);
      return;
    }

    exportRowsToExcel(`${fileBase}.xlsx`, fileBase, exportRows);
  }

  const buildingTransactionSelector = initialInvoiceAssignment ? (
    <Segmented<"expense" | "income">
      block
      options={[
        { label: t.expenses, value: "expense" },
        { label: t.income, value: "income" },
      ]}
      value={buildingTransactionKind}
      onChange={setBuildingTransactionKind}
    />
  ) : null;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <FinancePageHeader
        addLabel={t.addInvoice}
        countText={t.expense_count(tableQuery.data?.total ?? 0)}
        excelLabel={t.excel}
        rowsLength={rows.length}
        title={t.invoicesTitle}
        onAdd={() => {
          setSelectedInvoice(undefined);
          setInitialInvoiceAssignment(undefined);
          setBuildingTransactionKind("expense");
          setOpen(true);
        }}
        onExportCsv={() => exportInvoices("csv")}
        onExportExcel={() => exportInvoices("xlsx")}
      />

      {allInvoicesQuery.isError || visualizationBuildingsQuery.isError ? (
        <Alert
          showIcon
          type="error"
          message={t.invoicesTitle}
          description={toErrorMessage(allInvoicesQuery.error ?? visualizationBuildingsQuery.error)}
          action={
            <Button
              onClick={() => {
                void allInvoicesQuery.refetch();
                void visualizationBuildingsQuery.refetch();
              }}
            >
              {t.retry}
            </Button>
          }
        />
      ) : null}

      <ProjectExpenseVisualization
        buildings={visualizationBuildingsQuery.data}
        invoices={allInvoicesQuery.data}
        loading={allInvoicesQuery.isLoading || visualizationBuildingsQuery.isLoading}
        projects={projects}
        projectLocked={scopedProjectId != null}
        selectedProjectId={selectedVisualizationProjectId}
        onAddTransaction={(assignment) => {
          setSelectedInvoice(undefined);
          setInitialInvoiceAssignment(assignment);
          setBuildingTransactionKind("expense");
          setOpen(true);
        }}
        onProjectChange={setVisualizationProjectId}
      />

      <FinanceFilters<InvoiceStatus>
        allCurrenciesLabel={t.allCurrencies}
        allProjectsLabel={t.allProjects}
        allStatusesLabel={t.allStatuses}
        allSuppliersLabel={t.allSuppliers}
        clearLabel={t.clearFilters}
        currencyValue={currencyFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        hasFilters={hasFilters}
        projectDisabled={scopedProjectId != null}
        projectValue={effectiveProjectFilter}
        projects={projects}
        searchPlaceholder={`${t.search} ${t.expenses.toLowerCase()}`}
        searchValue={searchInput}
        statusOptions={[
          { label: t.unpaidFilter, value: "unpaid" },
          { label: t.partialFilter, value: "partial" },
          { label: t.paidFilter, value: "paid" },
        ]}
        statusValue={statusFilter}
        suppliers={suppliers}
        supplierValue={supplierFilter}
        onClear={() => {
          setSearchInput("");
          setStatusFilter("all");
          setProjectFilter(scopedProjectId == null ? "all" : String(scopedProjectId));
          setSupplierFilter("all");
          setCurrencyFilter("all");
          setDateFrom("");
          setDateTo("");
        }}
        onCurrencyChange={setCurrencyFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onProjectChange={setProjectFilter}
        onSearchChange={setSearchInput}
        onStatusChange={setStatusFilter}
        onSupplierChange={setSupplierFilter}
      />

      {tableQuery.isError ? (
        <Alert
          showIcon
          type="error"
          message={t.invoicesTitle}
          description={toErrorMessage(tableQuery.error)}
          action={<Button onClick={() => void tableQuery.refetch()}>{t.retry}</Button>}
        />
      ) : null}

      <Table<InvoiceRow>
        {...tableProps}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1200 }}
        pagination={standardPagination(tableProps.pagination, (total) => `${total} ${t.expenses.toLowerCase()}`)}
      />

      {open && initialInvoiceAssignment && buildingTransactionKind === "income" ? (
        <IncomeModal
          headerExtra={buildingTransactionSelector}
          income={null}
          initialAssignment={initialInvoiceAssignment}
          open
          onClose={() => {
            setOpen(false);
            setSelectedInvoice(undefined);
            setInitialInvoiceAssignment(undefined);
            setBuildingTransactionKind("expense");
          }}
          onSaved={() => {
            void erpInvalidation.income();
          }}
        />
      ) : open ? (
        <InvoiceModal
          headerExtra={buildingTransactionSelector}
          invoice={selectedInvoice}
          initialAssignment={initialInvoiceAssignment}
          onClose={() => {
            setOpen(false);
            setSelectedInvoice(undefined);
            setInitialInvoiceAssignment(undefined);
            setBuildingTransactionKind("expense");
          }}
          onSaved={() => {
            void tableQuery.refetch();
            void allInvoicesQuery.refetch();
          }}
        />
      ) : null}
    </Space>
  );
}
