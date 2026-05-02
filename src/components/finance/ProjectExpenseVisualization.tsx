import { Button, Empty, Select, Skeleton, Space, Table, Typography, type TableProps } from "antd";
import { Plus } from "lucide-react";
import type { Invoice, Project, ProjectBuilding } from "@/lib/erp";
import { formatCurrencyPair, formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";

type ExpenseSection = {
  buildingId: number | null;
  key: string;
  projectId: number | null;
  title: string;
  invoices: Invoice[];
  totalUsd: number;
  totalIqd: number;
};

type ExpenseAssignment = {
  projectId: number;
  buildingId: number;
};

type ProjectExpenseVisualizationProps = {
  buildings?: ProjectBuilding[];
  invoices?: Invoice[];
  loading?: boolean;
  projects?: Project[];
  projectLocked?: boolean;
  selectedProjectId: number | null;
  onProjectChange: (projectId: number) => void;
  onAddTransaction?: (assignment: ExpenseAssignment) => void;
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

function buildSection({
  buildingId,
  invoices,
  key,
  projectId,
  title,
}: {
  buildingId: number | null;
  invoices: Invoice[];
  key: string;
  projectId: number | null;
  title: string;
}): ExpenseSection {
  return {
    buildingId,
    key,
    projectId,
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
    buildSection({
      buildingId: building.id,
      invoices: invoicesByBuilding.get(building.id) ?? [],
      key: `building-${building.id}`,
      projectId: building.projectId,
      title: building.name,
    }),
  );

  invoicesByBuilding.forEach((buildingInvoices, buildingId) => {
    if (!knownBuildingIds.has(buildingId)) {
      sections.push(
        buildSection({
          buildingId,
          invoices: buildingInvoices,
          key: `building-${buildingId}`,
          projectId: buildingInvoices[0]?.projectId ?? null,
          title: buildingInvoices[0]?.buildingName ?? projectWideTitle,
        }),
      );
    }
  });

  if (projectWideInvoices.length || !sections.length) {
    sections.push(
      buildSection({
        buildingId: null,
        invoices: projectWideInvoices,
        key: "project-wide",
        projectId: projectWideInvoices[0]?.projectId ?? null,
        title: projectWideTitle,
      }),
    );
  }

  return sections;
}

function ExpensePanel({
  addTransactionLabel,
  columns,
  section,
  totalLabel,
  emptyText,
  onAddTransaction,
}: {
  addTransactionLabel: string;
  columns: TableProps<Invoice>["columns"];
  section: ExpenseSection;
  totalLabel: string;
  emptyText: string;
  onAddTransaction?: (assignment: ExpenseAssignment) => void;
}) {
  const canAddTransaction = section.projectId != null && section.buildingId != null;

  return (
    <section style={{ minWidth: 0, overflow: "hidden", borderRadius: 8, border: "1px solid #e5e0d5", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", minHeight: 52, alignItems: "center", justifyContent: "space-between", gap: 8, borderBottom: "1px solid #e5e0d5", background: "#f8f6f0", padding: "6px 12px" }}>
        <span style={{ flex: "1 1 0" }} />
        <Typography.Text strong style={{ minWidth: 0, flex: "2 1 auto", textAlign: "center" }}>
          {section.title}
        </Typography.Text>
        <span style={{ display: "flex", flex: "1 1 0", justifyContent: "flex-end" }}>
          {canAddTransaction && onAddTransaction ? (
            <Button
              aria-label={`${addTransactionLabel} - ${section.title}`}
              icon={<Plus size={14} />}
              size="small"
              type="text"
              onClick={() => {
                if (section.projectId != null && section.buildingId != null) {
                  onAddTransaction({ projectId: section.projectId, buildingId: section.buildingId });
                }
              }}
            >
              {addTransactionLabel}
            </Button>
          ) : null}
        </span>
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

      <div style={{ display: "flex", minHeight: 48, alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "1px solid #e5e0d5", background: "#fff", padding: "8px 12px" }}>
        <Typography.Text strong>{totalLabel}</Typography.Text>
        <Typography.Text strong style={{ textAlign: "right" }}>
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
  onAddTransaction,
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
      <div style={{ borderRadius: 8, border: "1px solid #e5e0d5", background: "#fff", padding: "12px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {sections.map((section) => (
            <ExpensePanel
              key={section.key}
              addTransactionLabel={t.addTransaction}
              columns={columns}
              emptyText={t.noExpenses}
              onAddTransaction={onAddTransaction}
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
