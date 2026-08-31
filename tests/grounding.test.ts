import { describe, expect, it } from "vitest";
import { buildContextBlock, rankRelevantItems } from "@/lib/copilot/grounding";
import type { NewsItem } from "@/lib/types";

function makeItem(overrides: Partial<NewsItem>): NewsItem {
  return {
    id: overrides.id ?? Math.random().toString(36),
    title: "Default title",
    summary: "Default summary",
    url: `https://example.com/${overrides.id ?? Math.random()}`,
    source: "Default Source",
    sourceUrl: "https://example.com",
    publishedAt: new Date().toISOString(),
    category: "ai",
    tags: [],
    ...overrides,
  };
}

describe("rankRelevantItems", () => {
  const items = [
    makeItem({
      id: "1",
      title: "GitHub Copilot adds new agent mode",
      summary: "A summary about Copilot agent mode features.",
      category: "github",
      githubTopic: "copilot",
    }),
    makeItem({
      id: "2",
      title: "OpenAI releases a new model",
      summary: "A summary about a new OpenAI model release.",
      category: "ai",
    }),
    makeItem({
      id: "3",
      title: "Completely unrelated gardening tips",
      summary: "Tips about growing tomatoes in your garden.",
      category: "industry",
    }),
  ];

  it("ranks items matching the question terms above unrelated items", () => {
    const results = rankRelevantItems("What's new with GitHub Copilot?", items);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.id).toBe("1");
    expect(results.some((r) => r.item.id === "3")).toBe(false);
  });

  it("excludes items that share no terms with the question", () => {
    const results = rankRelevantItems("OpenAI model release", items);
    expect(results.map((r) => r.item.id)).toContain("2");
    expect(results.map((r) => r.item.id)).not.toContain("3");
  });

  it("falls back to most-recent items when the question has no meaningful terms", () => {
    const results = rankRelevantItems("the a an", items, 2);
    expect(results).toHaveLength(2);
  });

  it("respects the topK limit", () => {
    const manyItems = Array.from({ length: 20 }, (_, i) =>
      makeItem({
        id: `copilot-${i}`,
        title: `GitHub Copilot update number ${i}`,
        summary: "Copilot summary",
        category: "github",
      }),
    );
    const results = rankRelevantItems("copilot", manyItems, 3);
    expect(results).toHaveLength(3);
  });
});

describe("buildContextBlock", () => {
  it("returns a message when there are no results", () => {
    expect(buildContextBlock([])).toMatch(/no matching articles/i);
  });

  it("numbers citations and includes title, source, date, summary, and URL", () => {
    const item = makeItem({
      id: "1",
      title: "Example Title",
      summary: "Example summary",
      source: "Example Source",
      url: "https://example.com/article",
      publishedAt: "2026-01-01T00:00:00.000Z",
    });
    const block = buildContextBlock([{ item, score: 1 }]);
    expect(block).toContain("[1]");
    expect(block).toContain("Example Title");
    expect(block).toContain("Example Source");
    expect(block).toContain("2026-01-01");
    expect(block).toContain("Example summary");
    expect(block).toContain("https://example.com/article");
  });
});
