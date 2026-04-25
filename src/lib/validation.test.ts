import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  deriveDualCurrencyInvoiceStatus,
  deriveInvoiceStatus,
  normalizeOptionalText,
  parseNumericInput,
  validateDualCurrencyInvoiceInput,
  validateInvoiceInput,
  validateProjectInput,
} from "./validation";

describe("validation helpers", () => {
  let storage = new Map<string, string>();

  beforeEach(() => {
    storage = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => {
            storage.set(key, value);
          },
          removeItem: (key: string) => {
            storage.delete(key);
          },
        },
      },
    });
    window.localStorage.removeItem("btp-lang");
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

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

  it("derives invoice status from both currencies", () => {
    expect(deriveDualCurrencyInvoiceStatus(100, 0, 250000, 0)).toBe("unpaid");
    expect(deriveDualCurrencyInvoiceStatus(100, 100, 250000, 0)).toBe("partial");
    expect(deriveDualCurrencyInvoiceStatus(100, 100, 250000, 250000)).toBe("paid");
  });

  it("rejects invalid dual-currency invoice values", () => {
    window.localStorage.setItem("btp-lang", "en");

    expect(() =>
      validateDualCurrencyInvoiceInput({
        totalAmountUsd: 0,
        paidAmountUsd: 0,
        totalAmountIqd: 0,
        paidAmountIqd: 0,
        invoiceDate: "2026-04-01",
        dueDate: "2026-04-10",
      }),
    ).toThrow("Total amount must include a positive USD or IQD amount.");

    expect(() =>
      validateDualCurrencyInvoiceInput({
        totalAmountUsd: 100,
        paidAmountUsd: 120,
        totalAmountIqd: 0,
        paidAmountIqd: 0,
        invoiceDate: "2026-04-01",
        dueDate: "2026-04-10",
      }),
    ).toThrow("Paid USD amount cannot be greater than total USD amount.");
  });

  it("rejects invalid invoice values", () => {
    expect(() =>
      validateInvoiceInput({
        totalAmount: 100,
        paidAmount: 120,
        invoiceDate: "2026-04-01",
        dueDate: "2026-04-10",
      }),
    ).toThrow("بڕی دراو نابێت لە کۆی بڕ زیاتر بێت.");

    expect(() =>
      validateInvoiceInput({
        totalAmount: 100,
        paidAmount: 20,
        invoiceDate: "2026-04-10",
        dueDate: "2026-04-01",
      }),
    ).toThrow("بەرواری قەرز نابێت لە بەرواری پسوڵە زووتر بێت.");
  });

  it("rejects invalid project values", () => {
    expect(() =>
      validateProjectInput({
        budget: -10,
        startDate: "2026-04-01",
        endDate: "2026-04-10",
      }),
    ).toThrow("بودجە دەبێت سفر یان زیاتر بێت.");

    expect(() =>
      validateProjectInput({
        budget: 1000,
        startDate: "2026-04-10",
        endDate: "2026-04-01",
      }),
    ).toThrow("بەرواری کۆتایی نابێت لە بەرواری دەستپێک زووتر بێت.");
  });

  it("returns English validation messages when English is selected", () => {
    window.localStorage.setItem("btp-lang", "en");

    expect(() =>
      validateInvoiceInput({
        totalAmount: 100,
        paidAmount: 120,
        invoiceDate: "2026-04-01",
        dueDate: "2026-04-10",
      }),
    ).toThrow("Paid amount cannot be greater than total amount.");

    expect(() =>
      validateProjectInput({
        budget: -10,
        startDate: "2026-04-01",
        endDate: "2026-04-10",
      }),
    ).toThrow("Budget must be zero or greater.");
  });
});
