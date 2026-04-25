import type { CrudFilters } from "@refinedev/core";
import type { Currency, InvoiceStatus, ProjectStatus, RecordStatus } from "@/lib/erp";
import { deriveDualCurrencyInvoiceStatus, deriveInvoiceStatus } from "@/lib/validation";

export const STANDARD_PAGE_SIZE = 10;

export function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function asCurrency(value: unknown): Currency {
  return value === "IQD" ? "IQD" : "USD";
}

export function asProjectStatus(value: unknown): ProjectStatus {
  return value === "completed" || value === "paused" ? value : "active";
}

export function asRecordStatus(value: unknown): RecordStatus {
  return value === "deleted" ? "deleted" : "active";
}

export function asInvoiceStatus(value: unknown, totalAmount = 0, paidAmount = 0): InvoiceStatus {
  if (value === "paid" || value === "partial" || value === "unpaid") {
    return value;
  }

  return deriveInvoiceStatus(totalAmount, paidAmount);
}

export function asDualCurrencyInvoiceStatus(
  value: unknown,
  totalAmountUsd = 0,
  paidAmountUsd = 0,
  totalAmountIqd = 0,
  paidAmountIqd = 0,
): InvoiceStatus {
  if (value === "paid" || value === "partial" || value === "unpaid") {
    return value;
  }

  return deriveDualCurrencyInvoiceStatus(totalAmountUsd, paidAmountUsd, totalAmountIqd, paidAmountIqd);
}

export function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function addContainsSearchFilter(filters: CrudFilters, fields: string[], search: string) {
  if (!search) {
    return;
  }

  filters.push({
    operator: "or",
    value: fields.map((field) => ({
      field,
      operator: "contains",
      value: search,
    })),
  });
}

export function addEqualFilter(filters: CrudFilters, field: string, value: string | number | null | undefined) {
  if (value == null || value === "" || value === "all") {
    return;
  }

  filters.push({ field, operator: "eq", value });
}

export function addCurrencyAmountFilter(
  filters: CrudFilters,
  currency: Currency | "all",
  fieldByCurrency: Record<Currency, string>,
) {
  if (currency === "all") {
    return;
  }

  filters.push({ field: fieldByCurrency[currency], operator: "gt", value: 0 });
}

export function addDateRangeFilter(filters: CrudFilters, field: string, dateFrom: string, dateTo: string) {
  if (dateFrom) {
    filters.push({ field, operator: "gte", value: dateFrom });
  }

  if (dateTo) {
    filters.push({ field, operator: "lte", value: dateTo });
  }
}
