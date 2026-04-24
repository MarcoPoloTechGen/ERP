import type { CrudFilters } from "@refinedev/core";

export const STANDARD_PAGE_SIZE = 10;

export function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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

export function addDateRangeFilter(filters: CrudFilters, field: string, dateFrom: string, dateTo: string) {
  if (dateFrom) {
    filters.push({ field, operator: "gte", value: dateFrom });
  }

  if (dateTo) {
    filters.push({ field, operator: "lte", value: dateTo });
  }
}
