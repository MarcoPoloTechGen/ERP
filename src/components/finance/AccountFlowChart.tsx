import { useMemo } from "react";
import { LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { LabelLayout } from "echarts/features";
import { SVGRenderer } from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/lib/core";
import type { EChartsOption } from "echarts";
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
  balanceDeltaUsd: number;
  balanceDeltaIqd: number;
  transactionUsd: number;
  transactionIqd: number;
  buildingName?: string | null;
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
  exchangeRateIqdPer100Usd?: number | null;
  title: ReactNode;
};

type CurrencyKey = "usd" | "iqd";

type CurrencyConfig = {
  axisIndex: number;
  color: string;
  deltaKey: "balanceDeltaUsd" | "balanceDeltaIqd";
  key: CurrencyKey;
  label: string;
  transactionKey: "transactionUsd" | "transactionIqd";
};

type ChartPoint = {
  affected: boolean;
  balance: number;
  buildingName: string | null;
  date: string | null;
  id: number | string;
  isStart: boolean;
  transaction: number;
  value: number;
};

type Scale = {
  interval?: number;
  max: number;
  min: number;
};

const CURRENCIES: CurrencyConfig[] = [
  {
    axisIndex: 0,
    color: "#047857",
    deltaKey: "balanceDeltaUsd",
    key: "usd",
    label: formatCurrencyLabel("USD"),
    transactionKey: "transactionUsd",
  },
  {
    axisIndex: 1,
    color: "#2563eb",
    deltaKey: "balanceDeltaIqd",
    key: "iqd",
    label: formatCurrencyLabel("IQD"),
    transactionKey: "transactionIqd",
  },
];

echarts.use([DataZoomComponent, GridComponent, LabelLayout, LegendComponent, LineChart, SVGRenderer, TooltipComponent]);

function currencyAmount(value: number, currencyKey: CurrencyKey) {
  return formatCurrency(value, currencyKey === "usd" ? "USD" : "IQD");
}

function axisAmount(value: number, currencyKey: CurrencyKey) {
  const label = formatCurrencyLabel(currencyKey === "usd" ? "USD" : "IQD");
  const amount = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(Number.isFinite(value) ? value : 0);

  return currencyKey === "usd" ? `${label}${amount}` : `${amount} ${label}`;
}

function sortDateKey(value: string | null) {
  return value && !Number.isNaN(new Date(value).getTime()) ? value : "9999-12-31";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncateLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.length > 18 ? `${value.slice(0, 17)}...` : value;
}

function sortEntries(entries: AccountFlowEntry[]) {
  return [...entries].sort((left, right) => {
    const dateSort = sortDateKey(left.date).localeCompare(sortDateKey(right.date));
    if (dateSort !== 0) {
      return dateSort;
    }

    return String(left.id).localeCompare(String(right.id), undefined, { numeric: true });
  });
}

function buildPoints(entries: AccountFlowEntry[], currency: CurrencyConfig): ChartPoint[] {
  let balance = 0;

  return [
    {
      affected: true,
      balance: 0,
      buildingName: null,
      date: null,
      id: "start",
      isStart: true,
      transaction: 0,
      value: 0,
    },
    ...entries.map((entry) => {
      const delta = entry[currency.deltaKey];
      const transaction = entry[currency.transactionKey];
      balance += delta;

      return {
        affected: delta !== 0 || transaction !== 0,
        balance,
        buildingName: entry.buildingName ?? null,
        date: entry.date,
        id: entry.id,
        isStart: false,
        transaction,
        value: balance,
      };
    }),
  ];
}

function niceCeilInterval(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(value));
  const power = 10 ** exponent;
  const fraction = value / power;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;

  return niceFraction * power;
}

function buildZeroAlignedScale(values: number[]): Scale {
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const span = Math.max(1, maxValue - minValue);
  const paddedMin = minValue < 0 ? minValue - span * 0.12 : 0;
  const paddedMax = maxValue > 0 ? maxValue + span * 0.12 : 0;
  const interval = niceCeilInterval(Math.max(1, paddedMax - paddedMin) / 4);
  const min = Math.floor(paddedMin / interval) * interval;
  const max = Math.ceil(paddedMax / interval) * interval;

  return {
    interval,
    max: max === min ? min + interval : max,
    min,
  };
}

function buildScale(points: ChartPoint[]): Scale {
  return buildZeroAlignedScale(points.map((point) => point.balance));
}

function normalizeExchangeRate(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function buildSyncedScale(
  seriesData: Array<{ currency: CurrencyConfig; points: ChartPoint[]; scale: Scale }>,
  exchangeRateIqdPer100Usd: number | null,
) {
  if (!exchangeRateIqdPer100Usd) {
    return null;
  }

  const usdEquivalentPoints = seriesData.flatMap(({ currency, points }) =>
    points.map((point) => ({
      ...point,
      balance: currency.key === "iqd" ? (point.balance * 100) / exchangeRateIqdPer100Usd : point.balance,
    })),
  );
  const usdScale = buildScale(usdEquivalentPoints);
  const iqdPerUsd = exchangeRateIqdPer100Usd / 100;

  return {
    iqd: {
      interval: usdScale.interval ? usdScale.interval * iqdPerUsd : undefined,
      max: usdScale.max * iqdPerUsd,
      min: usdScale.min * iqdPerUsd,
    },
    usd: usdScale,
  };
}

function buildTooltipFormatter(dateLabel: ReactNode) {
  return (rawParams: unknown) => {
    const params = Array.isArray(rawParams) ? rawParams : [rawParams];
    const validParams = params.filter(Boolean) as Array<{
      color?: string;
      data?: ChartPoint;
      marker?: string;
      seriesName?: string;
    }>;
    const firstPoint = validParams.find((param) => param.data && !param.data.isStart)?.data;
    const date = firstPoint?.date ? formatDate(firstPoint.date) : "0";
    const building = firstPoint?.buildingName;
    const rows = validParams
      .map((param) => {
        const point = param.data;
        const currency = CURRENCIES.find((item) => item.label === param.seriesName);

        if (!point || !currency) {
          return null;
        }

        const transaction = point.affected && !point.isStart
          ? `<span style="color:${currency.color};font-weight:600">${point.transaction > 0 ? "+" : ""}${escapeHtml(currencyAmount(point.transaction, currency.key))}</span>`
          : "";

        return `<div style="display:flex;justify-content:space-between;gap:18px;margin-top:6px">
          <span>${param.marker ?? ""}${escapeHtml(param.seriesName ?? "")}</span>
          <span style="font-weight:700">${escapeHtml(currencyAmount(point.balance, currency.key))}</span>
          ${transaction ? `<span>${transaction}</span>` : ""}
        </div>`;
      })
      .filter(Boolean)
      .join("");

    return `<div style="min-width:220px">
      <div style="font-weight:700">${escapeHtml(String(dateLabel))}: ${escapeHtml(date)}</div>
      ${building ? `<div style="margin-top:4px;color:#64748b">${escapeHtml(building)}</div>` : ""}
      ${rows}
    </div>`;
  };
}

function buildChartOption({
  amountLabel,
  dateLabel,
  entries,
  exchangeRateIqdPer100Usd,
}: {
  amountLabel: ReactNode;
  dateLabel: ReactNode;
  entries: AccountFlowEntry[];
  exchangeRateIqdPer100Usd?: number | null;
}): EChartsOption {
  const sortedEntries = sortEntries(entries);
  const xLabels = ["0", ...sortedEntries.map((entry) => formatDate(entry.date))];
  const showLabels = sortedEntries.length <= 12;
  const exchangeRate = normalizeExchangeRate(exchangeRateIqdPer100Usd);
  const rawSeriesData = CURRENCIES.map((currency) => {
    const points = buildPoints(sortedEntries, currency);
    const scale = buildScale(points);

    return {
      currency,
      points,
      scale,
    };
  });
  const syncedScale = buildSyncedScale(rawSeriesData, exchangeRate);
  const seriesData = rawSeriesData.map((item) => ({
    ...item,
    scale: syncedScale ? syncedScale[item.currency.key] : item.scale,
  }));

  return {
    animationDuration: 240,
    color: CURRENCIES.map((currency) => currency.color),
    dataZoom: [
      {
        filterMode: "none",
        moveOnMouseMove: true,
        moveOnMouseWheel: true,
        type: "inside",
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
      },
      {
        bottom: 16,
        filterMode: "none",
        height: 24,
        show: sortedEntries.length > 8,
        type: "slider",
        xAxisIndex: 0,
      },
    ],
    grid: {
      bottom: 72,
      containLabel: false,
      left: 86,
      right: 92,
      top: 52,
    },
    legend: {
      icon: "circle",
      left: "center",
      top: 6,
    },
    media: [
      {
        option: {
          dataZoom: [
            { type: "inside" },
            {
              bottom: 8,
              height: 18,
              show: sortedEntries.length > 5,
              type: "slider",
            },
          ],
          grid: {
            bottom: 66,
            left: 58,
            right: 58,
            top: 48,
          },
          series: CURRENCIES.map(() => ({
            label: { show: false },
          })),
          xAxis: {
            axisLabel: {
              fontSize: 10,
              interval: Math.max(0, Math.ceil(xLabels.length / 4) - 1),
              rotate: 28,
            },
          },
          yAxis: [
            { axisLabel: { fontSize: 10 } },
            { axisLabel: { fontSize: 10 } },
          ],
        },
        query: {
          maxWidth: 900,
        },
      },
    ],
    series: seriesData.map(({ currency, points }) => ({
      connectNulls: true,
      data: points,
      emphasis: {
        focus: "series",
      },
      itemStyle: {
        color: currency.color,
      },
      label: {
        color: currency.color,
        distance: currency.key === "usd" ? 10 : 14,
        formatter: (params: unknown) => {
          const data = (params as { data?: ChartPoint }).data;

          if (!showLabels || !data?.affected || data.isStart) {
            return "";
          }

          const building = truncateLabel(data.buildingName);
          const amount = `${data.transaction > 0 ? "+" : ""}${currencyAmount(data.transaction, currency.key)}`;

          return building ? `${amount}\n${building}` : amount;
        },
        fontSize: 10,
        fontWeight: 700,
        position: currency.key === "usd" ? "top" : "bottom",
        show: showLabels,
      },
      labelLayout: {
        hideOverlap: true,
      },
      lineStyle: {
        color: currency.color,
        width: 3,
      },
      name: currency.label,
      showSymbol: true,
      smooth: false,
      step: "end",
      symbol: "circle",
      symbolSize: (_value: unknown, params: unknown) => {
        return (params as { data?: ChartPoint }).data?.affected ? 7 : 0;
      },
      type: "line",
      yAxisIndex: currency.axisIndex,
    })),
    tooltip: {
      axisPointer: {
        type: "cross",
      },
      confine: true,
      formatter: buildTooltipFormatter(dateLabel),
      trigger: "axis",
    },
    xAxis: {
      axisLabel: {
        hideOverlap: true,
        interval: Math.max(0, Math.ceil(xLabels.length / 8) - 1),
        rotate: 25,
      },
      axisTick: {
        alignWithLabel: true,
      },
      data: xLabels,
      name: String(dateLabel),
      nameGap: 46,
      nameLocation: "middle",
      type: "category",
    },
    yAxis: seriesData.map(({ currency, scale }) => ({
      axisLabel: {
        color: currency.color,
        formatter: (value: number) => axisAmount(value, currency.key),
      },
      axisLine: {
        lineStyle: { color: currency.color },
        show: true,
      },
      max: scale.max,
      min: scale.min,
      interval: scale.interval,
      name: `${amountLabel} ${currency.label}`,
      nameTextStyle: {
        color: currency.color,
        fontWeight: 700,
      },
      position: currency.axisIndex === 0 ? "left" : "right",
      splitLine: {
        show: currency.axisIndex === 0,
      },
      splitNumber: 4,
      type: "value",
    })),
  };
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
  exchangeRateIqdPer100Usd,
  title,
}: AccountFlowChartProps) {
  const option = useMemo(
    () => buildChartOption({ amountLabel, dateLabel, entries, exchangeRateIqdPer100Usd }),
    [amountLabel, dateLabel, entries, exchangeRateIqdPer100Usd],
  );

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

          <ReactEChartsCore
            echarts={echarts}
            lazyUpdate
            notMerge
            option={option}
            opts={{ renderer: "svg" }}
            style={{ height: "clamp(360px, 58vh, 540px)", width: "100%" }}
          />
        </Space>
      )}
    </Card>
  );
}
