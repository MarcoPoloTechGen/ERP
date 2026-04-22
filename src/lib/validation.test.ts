import { describe, expect, it } from "vitest";
import {
  deriveInvoiceStatus,
  normalizeOptionalText,
  parseNumericInput,
  validateInvoiceInput,
  validateProjectInput,
} from "./validation";

describe("validation helpers", () => {
  it("normalizes optional text", () => {
    expect(normalizeOptionalText("  Hello  ")).toBe("Hello");
    expect(normalizeOptionalText("   ")).toBeNull();
  });

  it("parses numeric input safely", () => {
    expect(parseNumericInput("42.5")).toBe(42.5);
    expect(parseNumericInput("")).toBeNull();
    expect(parseNumericInput("nope")).toBeNull();
  });

  it("derives invoice status from amounts", () => {
    expect(deriveInvoiceStatus(100, 0)).toBe("unpaid");
    expect(deriveInvoiceStatus(100, 20)).toBe("partial");
    expect(deriveInvoiceStatus(100, 100)).toBe("paid");
  });

  it("rejects invalid invoice values", () => {
    expect(() =>
      validateInvoiceInput({
        totalAmount: 100,
        paidAmount: 120,
        invoiceDate: "2026-04-01",
        dueDate: "2026-04-10",
      }),
    ).toThrow("Paid amount cannot be greater than total amount.");

    expect(() =>
      validateInvoiceInput({
        totalAmount: 100,
        paidAmount: 20,
        invoiceDate: "2026-04-10",
        dueDate: "2026-04-01",
      }),
    ).toThrow("due date cannot be earlier than invoice date.");
  });

  it("rejects invalid project values", () => {
    expect(() =>
      validateProjectInput({
        budget: -10,
        startDate: "2026-04-01",
        endDate: "2026-04-10",
      }),
    ).toThrow("Budget must be zero or greater.");

    expect(() =>
      validateProjectInput({
        budget: 1000,
        startDate: "2026-04-10",
        endDate: "2026-04-01",
      }),
    ).toThrow("end date cannot be earlier than start date.");
  });
});
