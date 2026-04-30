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

const GRAPH_CURRENCY = "IQD";
const GRAPH_COLOR = "#2563eb";
const GRAPH_LABEL = formatCurrencyLabel(GRAPH_CURRENCY);

echarts.use([DataZoomComponent, GridComponent, LabelLayout, LegendComponent, LineChart, SVGRenderer, TooltipComponent]);

function currencyAmount(value: number, currencyKey: CurrencyKey) {
  return formatCurrency(value, currencyKey === "usd" ? "USD" : "IQD");
}

function axisAmount(value: number) {
  const amount = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(Number.isFinite(value) ? value : 0);

  return `${amount} ${GRAPH_LABEL}`;
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

function convertUsdToIqd(amountUsd: number, exchangeRateIqdPer100Usd: number | null) {
  return exchangeRateIqdPer100Usd ? (amountUsd * exchangeRateIqdPer100Usd) / 100 : 0;
}

function convertMoneyPairToIqd(amounts: { usd: number; iqd: number }, exchangeRateIqdPer100Usd: number | null) {
  return amounts.iqd + convertUsdToIqd(amounts.usd, exchangeRateIqdPer100Usd);
}

function buildPoints(entries: AccountFlowEntry[], exchangeRateIqdPer100Usd: number | null): ChartPoint[] {
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
      const delta = convertMoneyPairToIqd(
        { usd: entry.balanceDeltaUsd, iqd: entry.balanceDeltaIqd },
        exchangeRateIqdPer100Usd,
      );
      const transaction = convertMoneyPairToIqd(
        { usd: entry.transactionUsd, iqd: entry.transactionIqd },
        exchangeRateIqdPer100Usd,
      );
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

        if (!point) {
          return null;
        }

        const transaction = point.affected && !point.isStart
          ? `<span style="color:${GRAPH_COLOR};font-weight:600">${point.transaction > 0 ? "+" : ""}${escapeHtml(currencyAmount(point.transaction, "iqd"))}</span>`
          : "";

        return `<div style="display:flex;justify-content:space-between;gap:18px;margin-top:6px">
          <span>${param.marker ?? ""}${escapeHtml(param.seriesName ?? "")}</span>
          <span style="font-weight:700">${escapeHtml(currencyAmount(point.balance, "iqd"))}</span>
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
  const points = buildPoints(sortedEntries, exchangeRate);
  const scale = buildScale(points);

  return {
    animationDuration: 240,
    color: [GRAPH_COLOR],
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
      right: 32,
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
            right: 24,
            top: 48,
          },
          series: [
            {
              label: { show: false },
            },
          ],
          xAxis: {
            axisLabel: {
              fontSize: 10,
              interval: Math.max(0, Math.ceil(xLabels.length / 4) - 1),
              rotate: 28,
            },
          },
          yAxis: [
            {
              axisLabel: { fontSize: 10 },
            },
          ],
        },
        query: {
          maxWidth: 900,
        },
      },
    ],
    series: [
      {
        connectNulls: true,
        data: points,
        emphasis: {
          focus: "series",
        },
        itemStyle: {
          color: GRAPH_COLOR,
        },
        label: {
          color: GRAPH_COLOR,
          distance: 10,
          formatter: (params: unknown) => {
            const data = (params as { data?: ChartPoint }).data;

            if (!showLabels || !data?.affected || data.isStart) {
              return "";
            }

            const building = truncateLabel(data.buildingName);
            const amount = `${data.transaction > 0 ? "+" : ""}${currencyAmount(data.transaction, "iqd")}`;

            return building ? `${amount}\n${building}` : amount;
          },
          fontSize: 10,
          fontWeight: 700,
          position: "top",
          show: showLabels,
        },
        labelLayout: {
          hideOverlap: true,
        },
        lineStyle: {
          color: GRAPH_COLOR,
          width: 3,
        },
        name: GRAPH_LABEL,
        showSymbol: true,
        smooth: false,
        step: "end",
        symbol: "circle",
        symbolSize: (_value: unknown, params: unknown) => {
          return (params as { data?: ChartPoint }).data?.affected ? 7 : 0;
        },
        type: "line",
      },
    ],
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
    yAxis: [
      {
        axisLabel: {
          color: GRAPH_COLOR,
          formatter: (value: number) => axisAmount(value),
        },
        axisLine: {
          lineStyle: { color: GRAPH_COLOR },
          show: true,
        },
        max: scale.max,
        min: scale.min,
        interval: scale.interval,
        name: `${amountLabel} ${GRAPH_LABEL}`,
        nameTextStyle: {
          color: GRAPH_COLOR,
          fontWeight: 700,
        },
        position: "left",
        splitLine: {
          show: true,
        },
        splitNumber: 4,
        type: "value",
      },
    ],
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
    <div style={{ minHeight: 96, borderRadius: 8, border: "1px solid #e5e0d5", background: "#fff", padding: "12px 16px" }}>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <div style={{ marginTop: 8 }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
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
