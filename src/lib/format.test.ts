import { describe, expect, it } from "vitest";
import {
  currencyInputProps,
  formatCurrency,
  formatCurrencyInputValue,
  formatCurrencyPair,
  formatDate,
  formatDateInput,
  parseCurrencyInputValue,
} from "./format";

const LTR_ISOLATE_START = "\u2066";
const LTR_ISOLATE_END = "\u2069";

describe("format helpers", () => {
  it("formats currencies with the correct precision", () => {
    expect(formatCurrency(123456, "USD")).toBe(`${LTR_ISOLATE_START}123,456.00 $${LTR_ISOLATE_END}`);
    expect(formatCurrency(1234.56, "USD")).toBe(`${LTR_ISOLATE_START}1,234.56 $${LTR_ISOLATE_END}`);
    expect(formatCurrency(1200, "IQD")).toBe(`${LTR_ISOLATE_START}1,200.00 IQD${LTR_ISOLATE_END}`);
    expect(formatCurrency(155_000_000_000, "IQD")).toBe(
      `${LTR_ISOLATE_START}155,000,000,000.00 IQD${LTR_ISOLATE_END}`,
    );
  });

  it("formats and parses currency input values", () => {
    expect(formatCurrencyInputValue(123456)).toBe("123,456.00");
    expect(formatCurrencyInputValue(1234.56)).toBe("1,234.56");
    expect(formatCurrencyInputValue(155_000_000_000)).toBe("155,000,000,000.00");
    expect(parseCurrencyInputValue("123,456.00 $")).toBe("123456.00");
    expect(parseCurrencyInputValue("1,234.56 $")).toBe("1234.56");
    expect(parseCurrencyInputValue("1 234,56 $")).toBe("1234.56");
    expect(parseCurrencyInputValue("\u0661\u0665\u0665,\u0660\u0660\u0660,\u0660\u0660\u0660,\u0660\u0660\u0660.\u0660\u0660 IQD")).toBe("155000000000.00");
    expect(parseCurrencyInputValue(`${LTR_ISOLATE_START}123,456.00 $${LTR_ISOLATE_END}`)).toBe("123456.00");
  });

  it("keeps currency inputs left-to-right in rtl layouts", () => {
    expect(currencyInputProps("USD")).toMatchObject({
      className: "erp-currency-input-ltr",
      "data-currency": "USD",
      dir: "ltr",
      precision: 2,
      step: 0.01,
    });
  });

  it("formats currency pairs without mixing currencies", () => {
    expect(formatCurrencyPair({ usd: 10, iqd: 1250 })).toContain("/");
    expect(formatCurrencyPair({ usd: 10, iqd: 1250 })).toContain("$");
    expect(formatCurrencyPair({ usd: 10, iqd: 1250 })).not.toContain("USD");
    expect(formatCurrencyPair({ usd: 0, iqd: 1250 }, { hideZero: true })).not.toContain("$");
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
