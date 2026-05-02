import { Button, Popover, Empty, Select, Skeleton, Space, Table, Typography, type TableProps } from "antd";
import { Plus } from "lucide-react";
import { expenseTypeLabel, invoiceStatusLabel } from "@/components/invoices/invoice-shared";
import type { IncomeTransaction, Invoice, Project, ProjectBuilding } from "@/lib/erp";
import { formatCurrencyPair, formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";

type MoneyMovement = {
  id: string;
  type: "expense" | "income";
  projectId: number | null;
  projectName: string | null;
  buildingId: number | null;
  buildingName: string | null;
  date: string | null;
  title: string;
  sourceLabel: string;
  counterparty: string | null;
  description: string | null;
  status: string | null;
  amountUsd: number;
  amountIqd: number;
};

type ExpenseSection = {
  buildingId: number | null;
  key: string;
  projectId: number | null;
  title: string;
  movements: MoneyMovement[];
  totalUsd: number;
  totalIqd: number;
};

type ExpenseAssignment = {
  projectId: number;
  buildingId: number;
};

type ProjectExpenseVisualizationProps = {
  buildings?: ProjectBuilding[];
  incomes?: IncomeTransaction[];
  invoices?: Invoice[];
  loading?: boolean;
  projects?: Project[];
  projectLocked?: boolean;
  selectedProjectId: number | null;
  onProjectChange: (projectId: number) => void;
  onAddTransaction?: (assignment: ExpenseAssignment) => void;
};

function compareMovementsByDate(left: MoneyMovement, right: MoneyMovement) {
  const leftDate = left.date ?? "9999-12-31";
  const rightDate = right.date ?? "9999-12-31";
  const dateSort = leftDate.localeCompare(rightDate);

  if (dateSort !== 0) {
    return dateSort;
  }

  return left.title.localeCompare(right.title);
}

function buildSection({
  buildingId,
  key,
  movements,
  projectId,
  title,
}: {
  buildingId: number | null;
  key: string;
  movements: MoneyMovement[];
  projectId: number | null;
  title: string;
}): ExpenseSection {
  return {
    buildingId,
    key,
    projectId,
    title,
    movements: [...movements].sort(compareMovementsByDate),
    totalUsd: movements.reduce((total, movement) => total + movement.amountUsd, 0),
    totalIqd: movements.reduce((total, movement) => total + movement.amountIqd, 0),
  };
}

function buildSections({
  buildings,
  movements,
  projectWideTitle,
}: {
  buildings: ProjectBuilding[];
  movements: MoneyMovement[];
  projectWideTitle: string;
}) {
  const movementsByBuilding = new Map<number, MoneyMovement[]>();
  const projectWideMovements: MoneyMovement[] = [];

  movements.forEach((movement) => {
    if (movement.buildingId == null) {
      projectWideMovements.push(movement);
      return;
    }

    const current = movementsByBuilding.get(movement.buildingId) ?? [];
    current.push(movement);
    movementsByBuilding.set(movement.buildingId, current);
  });

  const knownBuildingIds = new Set(buildings.map((building) => building.id));
  const sections = buildings.map((building) =>
    buildSection({
      buildingId: building.id,
      key: `building-${building.id}`,
      movements: movementsByBuilding.get(building.id) ?? [],
      projectId: building.projectId,
      title: building.name,
    }),
  );

  movementsByBuilding.forEach((buildingMovements, buildingId) => {
    if (!knownBuildingIds.has(buildingId)) {
      sections.push(
        buildSection({
          buildingId,
          key: `building-${buildingId}`,
          movements: buildingMovements,
          projectId: buildingMovements[0]?.projectId ?? null,
          title: buildingMovements[0]?.buildingName ?? projectWideTitle,
        }),
      );
    }
  });

  if (projectWideMovements.length || !sections.length) {
    sections.push(
      buildSection({
        buildingId: null,
        key: "project-wide",
        movements: projectWideMovements,
        projectId: projectWideMovements[0]?.projectId ?? null,
        title: projectWideTitle,
      }),
    );
  }

  return sections;
}

function invoiceToMovement(invoice: Invoice, t: ReturnType<typeof useLang>["t"]): MoneyMovement {
  return {
    id: `expense-${invoice.id}`,
    type: "expense",
    projectId: invoice.projectId,
    projectName: invoice.projectName,
    buildingId: invoice.buildingId,
    buildingName: invoice.buildingName,
    date: invoice.invoiceDate,
    title: compactInvoiceTitle(invoice, t),
    sourceLabel: expenseTypeLabel(invoice.expenseType, t),
    counterparty: invoice.laborWorkerName ?? invoice.laborPersonName ?? invoice.productName ?? invoice.supplierName,
    description: invoice.notes,
    status: invoiceStatusLabel(invoice.status, t),
    amountUsd: -invoice.totalAmountUsd,
    amountIqd: -invoice.totalAmountIqd,
  };
}

function incomeToMovement(income: IncomeTransaction, fallbackTitle: string): MoneyMovement {
  return {
    id: `income-${income.id}`,
    type: "income",
    projectId: income.projectId,
    projectName: income.projectName,
    buildingId: income.buildingId,
    buildingName: income.buildingName,
    date: income.date,
    title: income.description?.trim() || fallbackTitle,
    sourceLabel: fallbackTitle,
    counterparty: income.createdByName,
    description: income.description,
    status: null,
    amountUsd: income.amountUsd,
    amountIqd: income.amountIqd,
  };
}

function formatCompactDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "2-digit" }).format(date);
}

function MovementDetails({
  movement,
  t,
}: {
  movement: MoneyMovement;
  t: ReturnType<typeof useLang>["t"];
}) {
  const amount = {
    usd: Math.abs(movement.amountUsd),
    iqd: Math.abs(movement.amountIqd),
  };

  return (
    <Space direction="vertical" size={4} style={{ width: 260 }}>
      <Typography.Text strong type={movement.type === "income" ? "success" : "danger"}>
        {movement.type === "income" ? t.income : t.expenses}
      </Typography.Text>
      <DetailLine label={t.totalAmount} value={formatCurrencyPair(amount, { hideZero: true })} />
      <DetailLine label={t.date} value={formatDate(movement.date)} />
      <DetailLine label={t.expenseType} value={movement.sourceLabel} />
      <DetailLine label={t.projectOption} value={movement.projectName ?? "-"} />
      <DetailLine label={t.buildingLabel} value={movement.buildingName ?? "-"} />
      {movement.counterparty ? <DetailLine label={t.name} value={movement.counterparty} /> : null}
      {movement.status ? <DetailLine label={t.status} value={movement.status} /> : null}
      {movement.description ? <DetailLine label={t.description} value={movement.description} /> : null}
    </Space>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "84px minmax(0, 1fr)", gap: 8 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Typography.Text>
      <Typography.Text style={{ fontSize: 12, overflowWrap: "anywhere" }}>{value}</Typography.Text>
    </div>
  );
}

function sumMovements(movements: MoneyMovement[], type?: MoneyMovement["type"]) {
  return movements.reduce(
    (totals, movement) => {
      if (type && movement.type !== type) {
        return totals;
      }

      return {
        usd: totals.usd + movement.amountUsd,
        iqd: totals.iqd + movement.amountIqd,
      };
    },
    { usd: 0, iqd: 0 },
  );
}

function amountTone(amounts: { usd: number; iqd: number }) {
  if (amounts.usd > 0 || amounts.iqd > 0) {
    return "success";
  }

  if (amounts.usd < 0 || amounts.iqd < 0) {
    return "danger";
  }

  return undefined;
}

function removeTitlePrefix(title: string, prefix: string | null | undefined) {
  if (!prefix) {
    return title;
  }

  const scopedPrefix = `${prefix} - `;
  return title.startsWith(scopedPrefix) ? title.slice(scopedPrefix.length).trim() : title;
}

function compactInvoiceTitle(invoice: Invoice, t: ReturnType<typeof useLang>["t"]) {
  const titleWithoutScope = [invoice.projectName, invoice.buildingName].reduce(
    (title, prefix) => removeTitlePrefix(title, prefix),
    invoice.number.trim(),
  );

  if (titleWithoutScope) {
    return titleWithoutScope;
  }

  return [
    expenseTypeLabel(invoice.expenseType, t),
    invoice.laborWorkerName ?? invoice.laborPersonName,
    invoice.productName ?? invoice.supplierName,
  ].filter(Boolean).join(" - ");
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
  columns: TableProps<MoneyMovement>["columns"];
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

      <Table<MoneyMovement>
        columns={columns}
        dataSource={section.movements}
        locale={{ emptyText }}
        pagination={false}
        rowKey="id"
        scroll={{ x: 320 }}
        size="small"
        className="erp-compact-expense-table"
      />

      <div style={{ display: "flex", minHeight: 44, alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "1px solid #e5e0d5", background: "#fff", padding: "6px 12px" }}>
        <Typography.Text strong>{totalLabel}</Typography.Text>
        <Typography.Text
          strong
          type={section.totalUsd > 0 || section.totalIqd > 0 ? "success" : section.totalUsd < 0 || section.totalIqd < 0 ? "danger" : undefined}
          style={{ textAlign: "right" }}
        >
          {formatCurrencyPair({ usd: section.totalUsd, iqd: section.totalIqd })}
        </Typography.Text>
      </div>
    </section>
  );
}

export default function ProjectExpenseVisualization({
  buildings = [],
  incomes = [],
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
  const projectIncomes = incomes.filter(
    (income) => income.projectId === selectedProjectId && income.recordStatus === "active",
  );
  const projectMovements = [
    ...projectInvoices.map((invoice) => invoiceToMovement(invoice, t)),
    ...projectIncomes.map((income) => incomeToMovement(income, t.income)),
  ];
  const allBuildingsIncomeTotal = sumMovements(projectMovements, "income");
  const allBuildingsExpenseTotal = sumMovements(projectMovements, "expense");
  const allBuildingsNetTotal = sumMovements(projectMovements);
  const sections = buildSections({
    buildings,
    movements: projectMovements,
    projectWideTitle: t.projectGlobalCost,
  });
  const columns: TableProps<MoneyMovement>["columns"] = [
    {
      title: t.date,
      dataIndex: "date",
      width: 58,
      render: (_value: string | null, movement) => (
        <Popover
          content={<MovementDetails movement={movement} t={t} />}
          trigger={["hover", "click"]}
          placement="topLeft"
        >
          <Typography.Text style={{ cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>
            {formatCompactDate(movement.date)}
          </Typography.Text>
        </Popover>
      ),
    },
    {
      title: t.expenseTitle,
      dataIndex: "title",
      render: (_value: string, movement) => (
        <Popover
          content={<MovementDetails movement={movement} t={t} />}
          trigger={["hover", "click"]}
          placement="topLeft"
        >
          <Typography.Text
            ellipsis={{ tooltip: false }}
            strong
            type={movement.type === "income" ? "success" : "danger"}
            style={{ cursor: "pointer", fontSize: 13, maxWidth: "100%" }}
          >
            {movement.title}
          </Typography.Text>
        </Popover>
      ),
    },
    {
      title: t.amount,
      dataIndex: "amountUsd",
      align: "right",
      width: 1,
      className: "erp-compact-amount-column",
      render: (_value: number, movement) => (
        <Popover
          content={<MovementDetails movement={movement} t={t} />}
          trigger={["hover", "click"]}
          placement="topRight"
        >
          <Typography.Text
            strong
            type={movement.type === "income" ? "success" : "danger"}
            style={{ cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}
          >
            {movement.type === "income" ? "+ " : "- "}
            {formatCurrencyPair({ usd: Math.abs(movement.amountUsd), iqd: Math.abs(movement.amountIqd) }, { hideZero: true })}
          </Typography.Text>
        </Popover>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <div style={{ borderRadius: 8, border: "1px solid #e5e0d5", background: "#fff", padding: "12px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <Space direction="vertical" size={6} style={{ minWidth: 240, flex: "1 1 320px" }}>
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
              <Typography.Text type="secondary">{t.expense_count(projectMovements.length)}</Typography.Text>
            ) : null}
          </Space>
          {selectedProjectId != null ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(120px, 1fr))", gap: 12, flex: "1 1 420px" }}>
              <Space direction="vertical" size={0} style={{ minWidth: 0 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t.income}</Typography.Text>
                <Typography.Text strong type="success" style={{ textAlign: "right" }}>
                  + {formatCurrencyPair(allBuildingsIncomeTotal, { hideZero: true })}
                </Typography.Text>
              </Space>
              <Space direction="vertical" size={0} style={{ minWidth: 0 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t.expenses}</Typography.Text>
                <Typography.Text strong type="danger" style={{ textAlign: "right" }}>
                  - {formatCurrencyPair({ usd: Math.abs(allBuildingsExpenseTotal.usd), iqd: Math.abs(allBuildingsExpenseTotal.iqd) }, { hideZero: true })}
                </Typography.Text>
              </Space>
              <Space direction="vertical" size={0} style={{ minWidth: 0 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t.totalAmount}</Typography.Text>
                <Typography.Text strong type={amountTone(allBuildingsNetTotal)} style={{ textAlign: "right" }}>
                  {formatCurrencyPair(allBuildingsNetTotal)}
                </Typography.Text>
              </Space>
            </div>
          ) : null}
        </div>
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
