import { describe, expect, it } from "vitest";
import { dateReminderStatus, daysUntilDate, isDateReminderVisible } from "@/lib/date-reminders";

describe("date reminders", () => {
  const today = new Date(2026, 4, 6);

  it("computes day differences from date-only strings", () => {
    expect(daysUntilDate("2026-05-06", today)).toBe(0);
    expect(daysUntilDate("2026-05-09", today)).toBe(3);
    expect(daysUntilDate("2026-05-01", today)).toBe(-5);
  });

  it("classifies reminder statuses", () => {
    expect(dateReminderStatus(-1)).toBe("overdue");
    expect(dateReminderStatus(0)).toBe("today");
    expect(dateReminderStatus(1)).toBe("upcoming");
  });

  it("shows overdue and near upcoming dates only", () => {
    expect(isDateReminderVisible(-30)).toBe(true);
    expect(isDateReminderVisible(7)).toBe(true);
    expect(isDateReminderVisible(8)).toBe(false);
    expect(isDateReminderVisible(null)).toBe(false);
  });
});
