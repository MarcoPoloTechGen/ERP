import { getStoredLang } from "@/lib/i18n";

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

const validationLabels = {
  "Total amount": {
    en: "Total amount",
    ku: "کۆی بڕ",
  },
  "Paid amount": {
    en: "Paid amount",
    ku: "بڕی دراو",
  },
  "invoice date": {
    en: "invoice date",
    ku: "بەرواری پسوڵە",
  },
  "due date": {
    en: "due date",
    ku: "بەرواری قەرز",
  },
  Budget: {
    en: "Budget",
    ku: "بودجە",
  },
  "start date": {
    en: "start date",
    ku: "بەرواری دەستپێک",
  },
  "end date": {
    en: "end date",
    ku: "بەرواری کۆتایی",
  },
  "Unit price": {
    en: "Unit price",
    ku: "نرخی یەکە",
  },
  "Transaction amount": {
    en: "Transaction amount",
    ku: "بڕی مامەڵە",
  },
  "Income amount": {
    en: "Income amount",
    ku: "بڕی داهات",
  },
} satisfies Record<string, { en: string; ku: string }>;

function isKurdishValidation() {
  return getStoredLang() === "ku";
}

function translateValidationLabel(label: string) {
  const lang = isKurdishValidation() ? "ku" : "en";
  return validationLabels[label]?.[lang] ?? label;
}

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
    const resolvedLabel = translateValidationLabel(label);
    throw new Error(
      isKurdishValidation()
        ? `${resolvedLabel} دەبێت سفر یان زیاتر بێت.`
        : `${resolvedLabel} must be zero or greater.`,
    );
  }
}

export function assertPositiveAmount(value: number | null | undefined, label: string) {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    const resolvedLabel = translateValidationLabel(label);
    throw new Error(
      isKurdishValidation()
        ? `${resolvedLabel} دەبێت لە سفر زیاتر بێت.`
        : `${resolvedLabel} must be greater than zero.`,
    );
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
    const resolvedStartLabel = translateValidationLabel(startLabel);
    const resolvedEndLabel = translateValidationLabel(endLabel);
    throw new Error(
      isKurdishValidation()
        ? `${resolvedEndLabel} نابێت لە ${resolvedStartLabel} زووتر بێت.`
        : `${resolvedEndLabel} cannot be earlier than ${resolvedStartLabel}.`,
    );
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
    throw new Error(
      isKurdishValidation()
        ? "بڕی دراو نابێت لە کۆی بڕ زیاتر بێت."
        : "Paid amount cannot be greater than total amount.",
    );
  }

  assertDateOrder(input.invoiceDate, input.dueDate, "invoice date", "due date");
}

export function validateProjectInput(input: ProjectValidationInput) {
  assertNonNegativeAmount(input.budget, "Budget");
  assertDateOrder(input.startDate, input.endDate, "start date", "end date");
}
