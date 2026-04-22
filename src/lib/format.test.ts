import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatDateInput } from "./format";

describe("format helpers", () => {
  it("formats currencies with the correct precision", () => {
    expect(formatCurrency(1234.56, "USD")).toContain("1,234.56");
    expect(formatCurrency(1200, "IQD")).toContain("1,200");
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
