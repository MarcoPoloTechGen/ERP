export const EXPENSE_TYPES = ["labor", "products", "logistics"] as const;

export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export function asExpenseType(value: unknown): ExpenseType {
  if (value === "labor" || value === "logistics") {
    return value;
  }

  return "products";
}
