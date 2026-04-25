import { Empty, Select, Skeleton, Space, Table, Typography, type TableProps } from "antd";
import type { Invoice, Project, ProjectBuilding } from "@/lib/erp";
import { formatCurrencyPair, formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";

type ExpenseSection = {
  key: string;
  title: string;
  invoices: Invoice[];
  totalUsd: number;
  totalIqd: number;
};

type ProjectExpenseVisualizationProps = {
  buildings?: ProjectBuilding[];
  invoices?: Invoice[];
  loading?: boolean;
  projects?: Project[];
  projectLocked?: boolean;
  selectedProjectId: number | null;
  onProjectChange: (projectId: number) => void;
};

function compareInvoicesByDate(left: Invoice, right: Invoice) {
  const leftDate = left.invoiceDate ?? "9999-12-31";
  const rightDate = right.invoiceDate ?? "9999-12-31";
  const dateSort = leftDate.localeCompare(rightDate);

  if (dateSort !== 0) {
    return dateSort;
  }

  return left.number.localeCompare(right.number);
}

function buildSection(key: string, title: string, invoices: Invoice[]): ExpenseSection {
  return {
    key,
    title,
    invoices: [...invoices].sort(compareInvoicesByDate),
    totalUsd: invoices.reduce((total, invoice) => total + invoice.totalAmountUsd, 0),
    totalIqd: invoices.reduce((total, invoice) => total + invoice.totalAmountIqd, 0),
  };
}

function buildSections({
  buildings,
  invoices,
  projectWideTitle,
}: {
  buildings: ProjectBuilding[];
  invoices: Invoice[];
  projectWideTitle: string;
}) {
  const invoicesByBuilding = new Map<number, Invoice[]>();
  const projectWideInvoices: Invoice[] = [];

  invoices.forEach((invoice) => {
    if (invoice.buildingId == null) {
      projectWideInvoices.push(invoice);
      return;
    }

    const current = invoicesByBuilding.get(invoice.buildingId) ?? [];
    current.push(invoice);
    invoicesByBuilding.set(invoice.buildingId, current);
  });

  const knownBuildingIds = new Set(buildings.map((building) => building.id));
  const sections = buildings.map((building) =>
    buildSection(`building-${building.id}`, building.name, invoicesByBuilding.get(building.id) ?? []),
  );

  invoicesByBuilding.forEach((buildingInvoices, buildingId) => {
    if (!knownBuildingIds.has(buildingId)) {
      sections.push(
        buildSection(
          `building-${buildingId}`,
          buildingInvoices[0]?.buildingName ?? projectWideTitle,
          buildingInvoices,
        ),
      );
    }
  });

  if (projectWideInvoices.length || !sections.length) {
    sections.push(buildSection("project-wide", projectWideTitle, projectWideInvoices));
  }

  return sections;
}

function ExpensePanel({
  columns,
  section,
  totalLabel,
  emptyText,
}: {
  columns: TableProps<Invoice>["columns"];
  section: ExpenseSection;
  totalLabel: string;
  emptyText: string;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-card-border bg-card shadow-sm">
      <div className="border-b border-card-border bg-muted px-3 py-2 text-center">
        <Typography.Text strong>{section.title}</Typography.Text>
      </div>

      <Table<Invoice>
        columns={columns}
        dataSource={section.invoices}
        locale={{ emptyText }}
        pagination={false}
        rowKey="id"
        scroll={{ x: 320 }}
        size="small"
      />

      <div className="flex min-h-12 items-center justify-between gap-3 border-t border-card-border bg-background px-3 py-2">
        <Typography.Text strong>{totalLabel}</Typography.Text>
        <Typography.Text strong className="text-right">
          {formatCurrencyPair({ usd: section.totalUsd, iqd: section.totalIqd })}
        </Typography.Text>
      </div>
    </section>
  );
}

export default function ProjectExpenseVisualization({
  buildings = [],
  invoices = [],
  loading = false,
  projects = [],
  projectLocked = false,
  selectedProjectId,
  onProjectChange,
}: ProjectExpenseVisualizationProps) {
  const { t } = useLang();
  const projectInvoices = invoices.filter(
    (invoice) => invoice.projectId === selectedProjectId && invoice.recordStatus === "active",
  );
  const sections = buildSections({
    buildings,
    invoices: projectInvoices,
    projectWideTitle: t.projectGlobalCost,
  });
  const columns: TableProps<Invoice>["columns"] = [
    {
      title: t.date,
      dataIndex: "invoiceDate",
      width: 116,
      render: (_value: string | null, invoice) => formatDate(invoice.invoiceDate),
    },
    {
      title: t.expenseTitle,
      dataIndex: "number",
      render: (_value: string, invoice) => (
        <Space direction="vertical" size={0} style={{ minWidth: 0, width: "100%" }}>
          <Typography.Text ellipsis={{ tooltip: invoice.number }} strong>
            {invoice.number}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatCurrencyPair(
              { usd: invoice.totalAmountUsd, iqd: invoice.totalAmountIqd },
              { hideZero: true },
            )}
          </Typography.Text>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <div className="rounded-md border border-card-border bg-card px-4 py-3 shadow-sm">
        <Space direction="vertical" size={6} style={{ width: "100%" }}>
          <Typography.Text strong>{t.projectOption}</Typography.Text>
          <Select<number>
            disabled={projectLocked || !projects.length}
            options={projects.map((project) => ({ label: project.name, value: project.id }))}
            placeholder={t.allProjects}
            showSearch
            optionFilterProp="label"
            style={{ width: "100%", maxWidth: 420 }}
            value={selectedProjectId ?? undefined}
            onChange={onProjectChange}
          />
          {selectedProjectId != null ? (
            <Typography.Text type="secondary">{t.expense_count(projectInvoices.length)}</Typography.Text>
          ) : null}
        </Space>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : selectedProjectId == null ? (
        <Empty description={t.noProjects} />
      ) : sections.length ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
          {sections.map((section) => (
            <ExpensePanel
              key={section.key}
              columns={columns}
              emptyText={t.noExpenses}
              section={section}
              totalLabel={t.totalAmount}
            />
          ))}
        </div>
      ) : (
        <Empty description={t.noExpenses} />
      )}
    </Space>
  );
}
