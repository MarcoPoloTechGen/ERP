import type { Currency } from "@/lib/erp";

const CURRENCY_DISPLAY_LABELS: Record<Currency, string> = {
  USD: "$",
  IQD: "IQD",
};

const MONEY_LOCALE = "en-US";
const MONEY_INPUT_CLASS_NAME = "erp-currency-input-ltr";
const MONEY_FRACTION_DIGITS = 0;

const CURRENCY_NUMBER_FORMATTER = new Intl.NumberFormat(MONEY_LOCALE, {
  minimumFractionDigits: MONEY_FRACTION_DIGITS,
  maximumFractionDigits: MONEY_FRACTION_DIGITS,
});

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
  return isolateLtr(formatCurrencyText(amount, currency));
}

export function formatCurrencyLabel(currency: Currency) {
  return CURRENCY_DISPLAY_LABELS[currency];
}

function formatCurrencyNumber(amount: number) {
  return CURRENCY_NUMBER_FORMATTER.format(Number.isFinite(amount) ? amount : 0);
}

function formatCurrencyInputNumber(amount: number) {
  return formatCurrencyNumber(amount);
}

function formatCurrencyText(amount: number, currency: Currency) {
  return `${formatCurrencyNumber(amount)} ${formatCurrencyLabel(currency)}`;
}

export function formatCurrencyInputValue(value: string | number | undefined) {
  if (value == null || value === "") {
    return "";
  }

  const amount = typeof value === "number" ? value : Number(parseCurrencyInputValue(value));
  if (!Number.isFinite(amount)) {
    return "";
  }

  return formatCurrencyInputNumber(amount);
}

export function parseCurrencyInputValue(value: string | undefined) {
  const cleanValue = normalizeCurrencyInputDigits(value ?? "").replace(/[^\d,.-]/g, "");
  if (cleanValue === "" || cleanValue === "-") {
    return "";
  }

  const lastComma = cleanValue.lastIndexOf(",");
  const lastDot = cleanValue.lastIndexOf(".");
  const decimalSeparator =
    lastComma >= 0 && lastDot >= 0
      ? lastComma > lastDot
        ? ","
        : "."
      : lastComma >= 0 && cleanValue.length - lastComma - 1 !== 3
        ? ","
        : lastDot >= 0 && cleanValue.length - lastDot - 1 !== 3
          ? "."
          : null;

  if (decimalSeparator === ",") {
    return cleanValue.replace(/\./g, "").replace(",", ".");
  }

  if (decimalSeparator === ".") {
    return cleanValue.replace(/,/g, "");
  }

  return cleanValue.replace(/[,.]/g, "");
}

export function currencyInputProps(currency: Currency) {
  return {
    className: MONEY_INPUT_CLASS_NAME,
    "data-currency": currency,
    dir: "ltr" as const,
    formatter: formatCurrencyInputValue,
    parser: parseCurrencyInputValue,
    precision: MONEY_FRACTION_DIGITS,
    step: 1,
    controls: false,
  };
}

function normalizeCurrencyInputDigits(value: string) {
  return value.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (digit) => {
    const codePoint = digit.charCodeAt(0);
    const zeroCodePoint = codePoint >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(codePoint - zeroCodePoint);
  });
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
    !options.hideZero || usd !== 0 ? formatCurrencyText(usd, "USD") : null,
    !options.hideZero || iqd !== 0 ? formatCurrencyText(iqd, "IQD") : null,
  ].filter(Boolean);

  return parts.length
    ? isolateLtr(parts.join(" / "))
    : isolateLtr(`${formatCurrencyText(0, "USD")} / ${formatCurrencyText(0, "IQD")}`);
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
