export type DateReminderStatus = "overdue" | "today" | "upcoming";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function utcDaySerial(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysUntilDate(value: string | Date | null | undefined, now = new Date()) {
  const date = parseDateOnly(value);
  if (!date) {
    return null;
  }

  return Math.round((utcDaySerial(date) - utcDaySerial(now)) / MS_PER_DAY);
}

export function dateReminderStatus(daysUntil: number): DateReminderStatus {
  if (daysUntil < 0) {
    return "overdue";
  }

  if (daysUntil === 0) {
    return "today";
  }

  return "upcoming";
}

export function isDateReminderVisible(daysUntil: number | null, windowDays = 7) {
  return daysUntil != null && daysUntil <= windowDays;
}
