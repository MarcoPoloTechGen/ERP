import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatCurrencyInputValue,
  formatCurrencyPair,
  formatDate,
  formatDateInput,
  parseCurrencyInputValue,
} from "./format";

describe("format helpers", () => {
  it("formats currencies with the correct precision", () => {
    expect(formatCurrency(123456, "USD")).toBe("123 456 $");
    expect(formatCurrency(1234.56, "USD")).toBe("1 234,56 $");
    expect(formatCurrency(1200, "IQD")).toBe("1 200 IQD");
  });

  it("formats and parses currency input values", () => {
    expect(formatCurrencyInputValue(123456, "USD")).toBe("123 456 $");
    expect(formatCurrencyInputValue(123456, "IQD")).toBe("123 456 IQD");
    expect(parseCurrencyInputValue("123 456 $")).toBe("123456");
    expect(parseCurrencyInputValue("1 234,56 $")).toBe("1234.56");
  });

  it("formats currency pairs without mixing currencies", () => {
    expect(formatCurrencyPair({ usd: 10, iqd: 1250 })).toContain("/");
    expect(formatCurrencyPair({ usd: 10, iqd: 1250 })).toContain("$");
    expect(formatCurrencyPair({ usd: 10, iqd: 1250 })).not.toContain("USD");
    expect(formatCurrencyPair({ usd: 0, iqd: 1250 }, { hideZero: true })).not.toContain("0.00");
  });

  it("formats dates safely", () => {
    expect(formatDate("2026-04-22")).toBe("22/04/2026");
    expect(formatDate("not-a-date")).toBe("-");
  });

  it("formats date inputs safely", () => {
    expect(formatDateInput("2026-04-22T15:20:00.000Z")).toBe("2026-04-22");
    expect(formatDateInput("not-a-date")).toBe("");
  });
});
