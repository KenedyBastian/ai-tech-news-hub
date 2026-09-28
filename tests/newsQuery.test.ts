import { describe, expect, it } from "vitest";
import { buildNewsResponse, queryNewsItems } from "@/lib/newsQuery";
import type { NewsItem } from "@/lib/types";

const reference = new Date("2026-03-04T12:00:00.000Z"); // Wednesday of week 2026-03-02..09

function makeItem(overrides: Partial<NewsItem>): NewsItem {
  return {
    id: overrides.id ?? Math.random().toString(36),
    title: "Default title",
    summary: "Default summary",
    url: `https://example.com/${overrides.id ?? Math.random()}`,
    source: "Default Source",
    sourceUrl: "https://example.com",
    publishedAt: "2026-03-03T00:00:00.000Z",
    category: "ai",
    tags: [],
    ...overrides,
  };
}

describe("queryNewsItems", () => {
  const items = [
    makeItem({
      id: "1",
      title: "AI breakthrough announced",
      category: "ai",
      publishedAt: "2026-03-03T00:00:00.000Z", // in-week
    }),
    makeItem({
      id: "2",
      title: "GitHub Copilot update",
      category: "github",
      githubTopic: "copilot",
      publishedAt: "2026-03-03T00:00:00.000Z", // in-week
    }),
    makeItem({
      id: "3",
      title: "Old AI story",
      category: "ai",
      publishedAt: "2026-01-01T00:00:00.000Z", // outside week
    }),
  ];

  it("defaults to the current week range", () => {
    const result = queryNewsItems(items, {}, reference);
    expect(result.map((i) => i.id).sort()).toEqual(["1", "2"]);
  });

  it("filters by category", () => {
    const result = queryNewsItems(items, { category: "github" }, reference);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("includes GitHub Advanced Security items when filtering by the security category", () => {
    const withGhas = [
      ...items,
      makeItem({
        id: "4",
        title: "GitHub Advanced Security expands trial availability",
        category: "github",
        githubTopic: "advanced-security",
        publishedAt: "2026-03-03T00:00:00.000Z", // in-week
      }),
      makeItem({
        id: "5",
        title: "GitHub Copilot CLI release notes",
        category: "github",
        githubTopic: "copilot",
        publishedAt: "2026-03-03T00:00:00.000Z", // in-week
      }),
    ];
    const result = queryNewsItems(
      withGhas,
      { category: "security" },
      reference,
    );
    expect(result.map((i) => i.id)).toEqual(["4"]);
  });

  it("filters by githubTopic", () => {
    const result = queryNewsItems(
      items,
      { category: "github", githubTopic: "copilot" },
      reference,
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by tag, case-insensitively, across any category", () => {
    const withTags = [
      ...items,
      makeItem({
        id: "6",
        title: "Microsoft earnings report",
        category: "industry",
        tags: ["Microsoft"],
        publishedAt: "2026-03-03T00:00:00.000Z", // in-week
      }),
      makeItem({
        id: "7",
        title: "Azure AI update",
        category: "developer-tools",
        tags: ["microsoft"],
        publishedAt: "2026-03-03T00:00:00.000Z", // in-week
      }),
    ];
    const result = queryNewsItems(withTags, { tag: "microsoft" }, reference);
    expect(result.map((i) => i.id).sort()).toEqual(["6", "7"]);
    expect(
      queryNewsItems(withTags, { tag: "MICROSOFT" }, reference).map(
        (i) => i.id,
      ),
    ).toEqual(result.map((i) => i.id));
  });

  it("filters by free-text search across title", () => {
    const result = queryNewsItems(items, { q: "copilot" }, reference);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("requires all whitespace-separated search terms to match", () => {
    const result = queryNewsItems(items, { q: "github copilot" }, reference);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
    expect(
      queryNewsItems(items, { q: "copilot nonexistent" }, reference),
    ).toHaveLength(0);
  });

  it("respects the 'all' range to include older items", () => {
    const result = queryNewsItems(items, { range: "all" }, reference);
    expect(result).toHaveLength(3);
  });

  it("sorts results by publishedAt descending", () => {
    const result = queryNewsItems(items, { range: "all" }, reference);
    expect(result.map((i) => i.publishedAt)).toEqual(
      [...result.map((i) => i.publishedAt)].sort().reverse(),
    );
  });
});

describe("buildNewsResponse", () => {
  it("widens to recent items when the current week is too sparse and there's no search", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      makeItem({
        id: `old-${i}`,
        publishedAt: new Date(
          reference.getTime() - (10 + i) * 86_400_000,
        ).toISOString(),
      }),
    );
    const response = buildNewsResponse(items, {}, reference, 6);
    expect(response.widened).toBe(true);
    expect(response.items).toHaveLength(6);
    expect(response.total).toBe(10);
  });

  it("does not widen when the current week already has enough items", () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      makeItem({
        id: `in-week-${i}`,
        publishedAt: "2026-03-03T00:00:00.000Z",
      }),
    );
    const response = buildNewsResponse(items, {}, reference, 6);
    expect(response.widened).toBe(false);
    expect(response.items).toHaveLength(8);
  });

  it("never widens a free-text search, even if results are sparse", () => {
    const items = [
      makeItem({
        id: "1",
        title: "Unique searchable term",
        publishedAt: "2026-03-03T00:00:00.000Z",
      }),
      makeItem({
        id: "2",
        title: "Something else entirely",
        publishedAt: "2026-03-03T00:00:00.000Z",
      }),
    ];
    const response = buildNewsResponse(
      items,
      { q: "unique searchable term" },
      reference,
      6,
    );
    expect(response.widened).toBe(false);
    expect(response.items).toHaveLength(1);
    expect(response.items[0].id).toBe("1");
  });

  it("reports the correct range even when widened", () => {
    const items = [
      makeItem({ id: "1", publishedAt: "2020-01-01T00:00:00.000Z" }),
    ];
    const response = buildNewsResponse(items, { range: "week" }, reference, 6);
    expect(response.range).toBe("week");
  });
});
