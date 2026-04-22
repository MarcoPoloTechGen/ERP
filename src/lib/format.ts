import type { Currency } from "@/lib/erp";

function getActiveLocale() {
  if (typeof document !== "undefined" && document.documentElement.lang === "ku") {
    return "ar-IQ";
  }

  if (typeof window !== "undefined" && window.localStorage.getItem("btp-lang") === "ku") {
    return "ar-IQ";
  }

  return "en-GB";
}

export function formatCurrency(amount: number, currency: Currency = "USD") {
  return new Intl.NumberFormat(getActiveLocale(), {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IQD" ? 0 : 2,
  }).format(Number.isFinite(amount) ? amount : 0);
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
