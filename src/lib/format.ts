import type { Currency } from "@/lib/erp";

const CURRENCY_DISPLAY_LABELS: Record<Currency, string> = {
  USD: "$",
  IQD: "IQD",
};

function getActiveLocale() {
  if (
    typeof document !== "undefined" &&
    (document.documentElement.lang === "ku" || document.documentElement.lang === "ckb")
  ) {
    return "ckb-IQ";
  }

  if (typeof window !== "undefined" && window.localStorage.getItem("btp-lang") === "ku") {
    return "ckb-IQ";
  }

  return "en-GB";
}

export function formatCurrency(amount: number, currency: Currency = "USD") {
  return new Intl.NumberFormat(getActiveLocale(), {
    style: "currency",
    currency,
    currencyDisplay: currency === "USD" ? "narrowSymbol" : "code",
    maximumFractionDigits: currency === "IQD" ? 0 : 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatCurrencyLabel(currency: Currency) {
  return CURRENCY_DISPLAY_LABELS[currency];
}

function formatCurrencyNumber(amount: number, currency: Currency) {
  return new Intl.NumberFormat(getActiveLocale(), {
    maximumFractionDigits: currency === "IQD" ? 0 : 2,
    minimumFractionDigits: currency === "IQD" ? 0 : 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function isolateLtr(value: string) {
  return `\u2066${value}\u2069`;
}

export function formatCurrencyPair(
  amounts: { usd: number | null | undefined; iqd: number | null | undefined },
  options: { hideZero?: boolean } = {},
) {
  const usd = Number.isFinite(amounts.usd) ? Number(amounts.usd) : 0;
  const iqd = Number.isFinite(amounts.iqd) ? Number(amounts.iqd) : 0;
  const parts = [
    !options.hideZero || usd !== 0 ? `${formatCurrencyNumber(usd, "USD")} ${formatCurrencyLabel("USD")}` : null,
    !options.hideZero || iqd !== 0 ? `${formatCurrencyNumber(iqd, "IQD")} ${formatCurrencyLabel("IQD")}` : null,
  ].filter(Boolean);

  return parts.length
    ? isolateLtr(parts.join(" / "))
    : isolateLtr(
        `${formatCurrencyNumber(0, "USD")} ${formatCurrencyLabel("USD")} / ${formatCurrencyNumber(0, "IQD")} ${formatCurrencyLabel("IQD")}`,
      );
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(getActiveLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(getActiveLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateInput(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function statusColors(status: string) {
  switch (status) {
    case "active":
    case "paid":
    case "credit":
      return "bg-emerald-100 text-emerald-800";
    case "deleted":
      return "bg-slate-200 text-slate-700";
    case "completed":
      return "bg-sky-100 text-sky-800";
    case "paused":
      return "bg-amber-100 text-amber-900";
    case "partial":
      return "bg-orange-100 text-orange-800";
    case "unpaid":
    case "debit":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
