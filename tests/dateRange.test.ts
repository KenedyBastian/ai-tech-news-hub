import { describe, expect, it } from "vitest";
import {
  filterByDateRange,
  getIsoWeekRange,
  isWithinRange,
  resolveDateRange,
} from "@/lib/dateRange";

describe("getIsoWeekRange", () => {
  it("returns Monday 00:00 UTC as the start of the week", () => {
    // Wednesday, 2026-03-04 (UTC)
    const reference = new Date("2026-03-04T15:30:00.000Z");
    const { start, end } = getIsoWeekRange(reference);
    expect(start.toISOString()).toBe("2026-03-02T00:00:00.000Z"); // Monday
    expect(end.toISOString()).toBe("2026-03-09T00:00:00.000Z"); // next Monday
  });

  it("treats Sunday as the last day of the previous ISO week", () => {
    // Sunday, 2026-03-08 (UTC)
    const reference = new Date("2026-03-08T23:59:59.000Z");
    const { start, end } = getIsoWeekRange(reference);
    expect(start.toISOString()).toBe("2026-03-02T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-09T00:00:00.000Z");
  });

  it("returns the same range when the reference is already Monday midnight", () => {
    const reference = new Date("2026-03-02T00:00:00.000Z");
    const { start, end } = getIsoWeekRange(reference);
    expect(start.toISOString()).toBe("2026-03-02T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-09T00:00:00.000Z");
  });
});

describe("isWithinRange", () => {
  const start = new Date("2026-03-02T00:00:00.000Z");
  const end = new Date("2026-03-09T00:00:00.000Z");

  it("includes timestamps at the start boundary (inclusive)", () => {
    expect(isWithinRange("2026-03-02T00:00:00.000Z", start, end)).toBe(true);
  });

  it("excludes timestamps at the end boundary (exclusive)", () => {
    expect(isWithinRange("2026-03-09T00:00:00.000Z", start, end)).toBe(false);
  });

  it("excludes timestamps before the start", () => {
    expect(isWithinRange("2026-03-01T23:59:59.000Z", start, end)).toBe(false);
  });

  it("returns false for unparsable timestamps", () => {
    expect(isWithinRange("not-a-date", start, end)).toBe(false);
  });
});

describe("resolveDateRange", () => {
  const reference = new Date("2026-03-04T12:00:00.000Z");

  it("resolves 'week' to the ISO week window", () => {
    const iso = getIsoWeekRange(reference);
    const resolved = resolveDateRange("week", reference);
    expect(resolved.start.toISOString()).toBe(iso.start.toISOString());
    expect(resolved.end.toISOString()).toBe(iso.end.toISOString());
  });

  it("resolves 'month' to a trailing 30-day window", () => {
    const resolved = resolveDateRange("month", reference);
    const diffDays =
      (resolved.end.getTime() - resolved.start.getTime()) / 86_400_000;
    expect(diffDays).toBeCloseTo(31, 5); // 30 days back + 1 day forward buffer
  });

  it("resolves 'all' to an open-ended window up to just past now", () => {
    const resolved = resolveDateRange("all", reference);
    expect(resolved.start.getTime()).toBe(0);
    expect(resolved.end.getTime()).toBeGreaterThan(reference.getTime());
  });
});

describe("filterByDateRange", () => {
  const reference = new Date("2026-03-04T12:00:00.000Z");
  const items = [
    { publishedAt: "2026-03-03T00:00:00.000Z" }, // in this week
    { publishedAt: "2026-02-01T00:00:00.000Z" }, // outside week, inside month is false too (>30d)
    { publishedAt: "2020-01-01T00:00:00.000Z" }, // ancient, only 'all' should include
  ];

  it("keeps only items within the current ISO week", () => {
    const result = filterByDateRange(items, "week", reference);
    expect(result).toHaveLength(1);
    expect(result[0].publishedAt).toBe("2026-03-03T00:00:00.000Z");
  });

  it("includes all items for the 'all' range", () => {
    const result = filterByDateRange(items, "all", reference);
    expect(result).toHaveLength(3);
  });
});
