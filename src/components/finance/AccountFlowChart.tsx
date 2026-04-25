import { Card, Empty, Space, Typography } from "antd";
import type { ReactNode } from "react";
import { formatCurrency, formatCurrencyLabel, formatCurrencyPair, formatDate } from "@/lib/format";

type MoneyPair = {
  usd: number;
  iqd: number;
};

export type AccountFlowEntry = {
  id: number | string;
  date: string | null;
  creditUsd: number;
  creditIqd: number;
  debitUsd: number;
  debitIqd: number;
};

type AccountFlowChartProps = {
  amountLabel: ReactNode;
  balance: MoneyPair;
  balanceLabel: ReactNode;
  countLabel: ReactNode;
  credit: MoneyPair;
  creditLabel: ReactNode;
  dateLabel: ReactNode;
  debit: MoneyPair;
  debitLabel: ReactNode;
  empty: boolean;
  emptyDescription: ReactNode;
  entries: AccountFlowEntry[];
  title: ReactNode;
};

type CurrencyKey = "usd" | "iqd";
type FlowKey = "credit" | "debit";

const CURRENCY_ROWS: Array<{
  creditKey: "creditUsd" | "creditIqd";
  debitKey: "debitUsd" | "debitIqd";
  key: CurrencyKey;
  label: string;
}> = [
  { creditKey: "creditUsd", debitKey: "debitUsd", key: "usd", label: formatCurrencyLabel("USD") },
  { creditKey: "creditIqd", debitKey: "debitIqd", key: "iqd", label: formatCurrencyLabel("IQD") },
];

const CHART_WIDTH = 900;
const CHART_HEIGHT = 300;
const PADDING = {
  top: 28,
  right: 34,
  bottom: 64,
  left: 72,
};
const CREDIT_COLOR = "#047857";
const DEBIT_COLOR = "#be123c";

type FlowPoint = {
  date: string;
  x: number;
  credit: number;
  debit: number;
};

function clampPercent(value: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / max) * 100));
}

function currencyAmount(value: number, currencyKey: CurrencyKey) {
  return formatCurrency(value, currencyKey === "usd" ? "USD" : "IQD");
}

function sortDateKey(value: string | null) {
  return value && !Number.isNaN(new Date(value).getTime()) ? value : "9999-12-31";
}

function buildFlowPoints(
  entries: AccountFlowEntry[],
  currency: (typeof CURRENCY_ROWS)[number],
): FlowPoint[] {
  const grouped = new Map<string, { credit: number; debit: number }>();

  for (const entry of entries) {
    const date = entry.date ?? "";
    const current = grouped.get(date) ?? { credit: 0, debit: 0 };
    grouped.set(date, {
      credit: current.credit + Math.abs(entry[currency.creditKey]),
      debit: current.debit + Math.abs(entry[currency.debitKey]),
    });
  }

  const sorted = Array.from(grouped, ([date, amounts]) => ({ date, ...amounts })).sort((left, right) =>
    sortDateKey(left.date).localeCompare(sortDateKey(right.date)),
  );
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  let creditTotal = 0;
  let debitTotal = 0;

  return sorted.map((point, index) => {
    creditTotal += point.credit;
    debitTotal += point.debit;

    return {
      date: point.date,
      x:
        sorted.length === 1
          ? PADDING.left + plotWidth / 2
          : PADDING.left + (index / (sorted.length - 1)) * plotWidth,
      credit: creditTotal,
      debit: debitTotal,
    };
  });
}

function createStepPath(points: FlowPoint[], flow: FlowKey, getY: (value: number) => number) {
  if (!points.length) {
    return "";
  }

  const [firstPoint, ...rest] = points;
  const commands = [`M ${firstPoint.x} ${getY(firstPoint[flow])}`];

  for (const point of rest) {
    commands.push(`H ${point.x}`);
    commands.push(`V ${getY(point[flow])}`);
  }

  return commands.join(" ");
}

function shouldShowDateLabel(index: number, count: number) {
  if (count <= 6) {
    return true;
  }

  const interval = Math.ceil(count / 5);
  return index === 0 || index === count - 1 || index % interval === 0;
}

function SummaryItem({
  label,
  tone,
  value,
}: {
  label: ReactNode;
  tone?: "credit" | "debit";
  value: MoneyPair;
}) {
  const textType = tone === "credit" ? "success" : tone === "debit" ? "danger" : undefined;

  return (
    <div className="min-h-24 rounded-md border border-card-border bg-background px-4 py-3">
      <Typography.Text type="secondary">{label}</Typography.Text>
      <div className="mt-2">
        <Typography.Text strong type={textType}>
          {formatCurrencyPair(value)}
        </Typography.Text>
      </div>
    </div>
  );
}

function DataLabel({
  currencyKey,
  value,
  x,
  y,
  color,
}: {
  currencyKey: CurrencyKey;
  value: number;
  x: number;
  y: number;
  color: string;
}) {
  if (value <= 0) {
    return null;
  }

  return (
    <text
      fill={color}
      fontSize="10"
      fontWeight="700"
      paintOrder="stroke"
      stroke="#fff"
      strokeLinejoin="round"
      strokeWidth="4"
      textAnchor="middle"
      x={x}
      y={y}
    >
      {currencyAmount(value, currencyKey)}
    </text>
  );
}

function CurrencyFlowChart({
  amountLabel,
  creditLabel,
  currency,
  dateLabel,
  debitLabel,
  entries,
}: {
  amountLabel: ReactNode;
  creditLabel: ReactNode;
  currency: (typeof CURRENCY_ROWS)[number];
  dateLabel: ReactNode;
  debitLabel: ReactNode;
  entries: AccountFlowEntry[];
}) {
  const points = buildFlowPoints(entries, currency);
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const baselineY = CHART_HEIGHT - PADDING.bottom;
  const maxAmount = Math.max(1, ...points.flatMap((point) => [point.credit, point.debit]));
  const getY = (value: number) => baselineY - (clampPercent(value, maxAmount) / 100) * plotHeight;
  const creditPath = createStepPath(points, "credit", getY);
  const debitPath = createStepPath(points, "debit", getY);
  const yTicks = [maxAmount, maxAmount / 2, 0];

  return (
    <div className="rounded-md border border-card-border bg-background px-3 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <Typography.Text strong>{currency.label}</Typography.Text>
        <Space size="middle" wrap>
          <Space size={6}>
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CREDIT_COLOR }} />
            <Typography.Text type="secondary">{creditLabel}</Typography.Text>
          </Space>
          <Space size={6}>
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DEBIT_COLOR }} />
            <Typography.Text type="secondary">{debitLabel}</Typography.Text>
          </Space>
        </Space>
      </div>

      <svg
        aria-label={`${currency.label} ${amountLabel}`}
        role="img"
        style={{ display: "block", height: 320, maxWidth: "100%", width: "100%" }}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      >
        {yTicks.map((tick) => {
          const y = getY(tick);

          return (
            <g key={tick}>
              <line
                stroke="rgba(15, 23, 42, 0.1)"
                strokeDasharray="4 6"
                x1={PADDING.left}
                x2={CHART_WIDTH - PADDING.right}
                y1={y}
                y2={y}
              />
              <text fill="rgba(15, 23, 42, 0.58)" fontSize="11" textAnchor="end" x={PADDING.left - 10} y={y + 4}>
                {currencyAmount(tick, currency.key)}
              </text>
            </g>
          );
        })}

        <line
          stroke="rgba(15, 23, 42, 0.88)"
          strokeWidth="2"
          x1={PADDING.left}
          x2={PADDING.left}
          y1={PADDING.top}
          y2={baselineY}
        />
        <line
          stroke="rgba(15, 23, 42, 0.88)"
          strokeWidth="2"
          x1={PADDING.left}
          x2={CHART_WIDTH - PADDING.right}
          y1={baselineY}
          y2={baselineY}
        />
        <text fill="rgba(15, 23, 42, 0.62)" fontSize="12" fontWeight="700" textAnchor="middle" x="22" y="132" transform="rotate(-90 22 132)">
          {amountLabel}
        </text>
        <text fill="rgba(15, 23, 42, 0.62)" fontSize="12" fontWeight="700" textAnchor="middle" x="486" y="292">
          {dateLabel}
        </text>

        {points.map((point, index) =>
          shouldShowDateLabel(index, points.length) ? (
            <text
              fill="rgba(15, 23, 42, 0.58)"
              fontSize="11"
              key={point.date || index}
              textAnchor="end"
              transform={`rotate(-28 ${point.x} ${baselineY + 28})`}
              x={point.x}
              y={baselineY + 28}
            >
              {formatDate(point.date)}
            </text>
          ) : null,
        )}

        <path d={creditPath} fill="none" stroke={CREDIT_COLOR} strokeLinejoin="round" strokeWidth="3" />
        <path d={debitPath} fill="none" stroke={DEBIT_COLOR} strokeLinejoin="round" strokeWidth="3" />

        {points.map((point, index) => (
          <g key={`${point.date || index}-points`}>
            <circle cx={point.x} cy={getY(point.credit)} fill={CREDIT_COLOR} r="3.5" />
            <circle cx={point.x} cy={getY(point.debit)} fill={DEBIT_COLOR} r="3.5" />
            <DataLabel
              color={CREDIT_COLOR}
              currencyKey={currency.key}
              value={point.credit}
              x={point.x}
              y={getY(point.credit) - 10}
            />
            <DataLabel
              color={DEBIT_COLOR}
              currencyKey={currency.key}
              value={point.debit}
              x={point.x}
              y={getY(point.debit) + 18}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function AccountFlowChart({
  amountLabel,
  balance,
  balanceLabel,
  countLabel,
  credit,
  creditLabel,
  dateLabel,
  debit,
  debitLabel,
  empty,
  emptyDescription,
  entries,
  title,
}: AccountFlowChartProps) {
  return (
    <Card title={title} extra={<Typography.Text type="secondary">{countLabel}</Typography.Text>}>
      {empty ? (
        <Empty description={emptyDescription} />
      ) : (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div className="grid gap-4 lg:grid-cols-3">
            <SummaryItem label={creditLabel} tone="credit" value={credit} />
            <SummaryItem label={debitLabel} tone="debit" value={debit} />
            <SummaryItem label={balanceLabel} value={balance} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {CURRENCY_ROWS.map((currency) => (
              <CurrencyFlowChart
                amountLabel={amountLabel}
                creditLabel={creditLabel}
                currency={currency}
                dateLabel={dateLabel}
                debitLabel={debitLabel}
                entries={entries}
                key={currency.key}
              />
            ))}
          </div>
        </Space>
      )}
    </Card>
  );
}
