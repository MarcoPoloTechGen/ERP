import type { InvoiceStatus } from "@/lib/erp";
import type { ExpenseType } from "@/lib/expense-types";
import type { useLang } from "@/lib/i18n";

export type InvoiceRow = {
  id: number | null;
  number: string | null;
  expense_type: string | null;
  labor_worker_id: number | null;
  labor_worker_name: string | null;
  labor_person_name: string | null;
  status: string | null;
  record_status: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  project_id: number | null;
  project_name: string | null;
  building_id: number | null;
  building_name: string | null;
  product_id: number | null;
  product_name: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  remaining_amount: number | null;
  currency: string | null;
  total_amount_usd: number | null;
  paid_amount_usd: number | null;
  remaining_amount_usd: number | null;
  total_amount_iqd: number | null;
  paid_amount_iqd: number | null;
  remaining_amount_iqd: number | null;
  invoice_date: string | null;
  due_date: string | null;
  notes: string | null;
  image_path: string | null;
  created_by_name: string | null;
  created_at: string | null;
};

export type InvoiceFormValues = {
  expenseType: ExpenseType;
  laborWorkerId?: number;
  supplierId?: number;
  assignmentKey?: string;
  productId?: number;
  paidAmountUsd?: number;
  remainingAmountUsd?: number;
  paidAmountIqd?: number;
  remainingAmountIqd?: number;
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
};

export const invoiceStatusColor: Record<InvoiceStatus, string> = {
  unpaid: "red",
  partial: "orange",
  paid: "green",
};

export function invoiceStatusLabel(status: InvoiceStatus, t: ReturnType<typeof useLang>["t"]) {
  if (status === "paid") {
    return t.paid;
  }
  if (status === "partial") {
    return t.partial;
  }
  return t.unpaid;
}

export function expenseTypeLabel(expenseType: ExpenseType, t: ReturnType<typeof useLang>["t"]) {
  if (expenseType === "labor") {
    return t.expenseTypeLabor;
  }
  if (expenseType === "logistics") {
    return t.expenseTypeLogistics;
  }
  return t.expenseTypeProducts;
}
