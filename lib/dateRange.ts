import type { DateRange } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the start (Monday 00:00:00) and end (following Monday 00:00:00,
 * exclusive) of the ISO week containing `reference`.
 */
export function getIsoWeekRange(reference: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const date = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate(),
    ),
  );
  // getUTCDay(): 0 = Sunday ... 6 = Saturday. ISO weeks start on Monday.
  const dayOfWeek = date.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = new Date(date.getTime() - diffToMonday * DAY_MS);
  const end = new Date(start.getTime() + 7 * DAY_MS);
  return { start, end };
}

/** Inclusive-start/exclusive-end range check against an ISO timestamp. */
export function isWithinRange(
  isoTimestamp: string,
  start: Date,
  end: Date,
): boolean {
  const time = new Date(isoTimestamp).getTime();
  if (Number.isNaN(time)) return false;
  return time >= start.getTime() && time < end.getTime();
}

/**
 * Resolves a {@link DateRange} keyword into a concrete [start, end) window
 * relative to `reference` (defaults to now).
 */
export function resolveDateRange(
  range: DateRange,
  reference: Date = new Date(),
): { start: Date; end: Date } {
  if (range === "all") {
    return { start: new Date(0), end: new Date(reference.getTime() + DAY_MS) };
  }
  if (range === "month") {
    const end = new Date(reference.getTime() + DAY_MS);
    const start = new Date(reference.getTime() - 30 * DAY_MS);
    return { start, end };
  }
  return getIsoWeekRange(reference);
}

/** Convenience filter used by the home page's default "This week" view. */
export function filterByDateRange<T extends { publishedAt: string }>(
  items: T[],
  range: DateRange,
  reference: Date = new Date(),
): T[] {
  const { start, end } = resolveDateRange(range, reference);
  return items.filter((item) => isWithinRange(item.publishedAt, start, end));
}
