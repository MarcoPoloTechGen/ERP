export type InvoiceValidationInput = {
  totalAmount: number;
  paidAmount: number;
  invoiceDate: string | null;
  dueDate: string | null;
};

export type ProjectValidationInput = {
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
};

export function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length ? trimmed : null;
}

export function parseNumericInput(value: string) {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function assertNonNegativeAmount(value: number | null | undefined, label: string) {
  if (value == null) {
    return;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be zero or greater.`);
  }
}

export function assertPositiveAmount(value: number | null | undefined, label: string) {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
}

export function assertDateOrder(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  startLabel: string,
  endLabel: string,
) {
  if (!startDate || !endDate) {
    return;
  }

  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return;
  }

  if (endTime < startTime) {
    throw new Error(`${endLabel} cannot be earlier than ${startLabel}.`);
  }
}

export function deriveInvoiceStatus(
  totalAmount: number,
  paidAmount: number,
  fallback: "unpaid" | "partial" | "paid" = "unpaid",
) {
  if (totalAmount > 0 && paidAmount >= totalAmount) {
    return "paid" as const;
  }

  if (paidAmount > 0) {
    return "partial" as const;
  }

  return fallback === "unpaid" ? fallback : "unpaid";
}

export function validateInvoiceInput(input: InvoiceValidationInput) {
  assertNonNegativeAmount(input.totalAmount, "Total amount");
  assertNonNegativeAmount(input.paidAmount, "Paid amount");

  if (input.paidAmount > input.totalAmount) {
    throw new Error("Paid amount cannot be greater than total amount.");
  }

  assertDateOrder(input.invoiceDate, input.dueDate, "invoice date", "due date");
}

export function validateProjectInput(input: ProjectValidationInput) {
  assertNonNegativeAmount(input.budget, "Budget");
  assertDateOrder(input.startDate, input.endDate, "start date", "end date");
}
