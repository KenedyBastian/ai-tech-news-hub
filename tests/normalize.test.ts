import { describe, expect, it } from "vitest";
import {
  canonicalizeUrl,
  deduplicateNewsItems,
  decodeHtmlEntities,
  idFromUrl,
  normalizeFeedItem,
  normalizeTitleKey,
  stripHtml,
  truncateSummary,
} from "@/lib/normalize";
import type { NewsItem } from "@/lib/types";

describe("decodeHtmlEntities", () => {
  it("decodes named entities", () => {
    expect(decodeHtmlEntities("Debian &amp; AI")).toBe("Debian & AI");
    expect(decodeHtmlEntities("Debian won&rsquo;t ban AI")).toBe(
      "Debian won\u2019t ban AI",
    );
  });

  it("decodes numeric and hex entities", () => {
    expect(decodeHtmlEntities("Debian won&#8217;t ban AI")).toBe(
      "Debian won\u2019t ban AI",
    );
    expect(decodeHtmlEntities("&#x26;")).toBe("&");
  });

  it("leaves unknown entities untouched", () => {
    expect(decodeHtmlEntities("&unknownEntity;")).toBe("&unknownEntity;");
  });
});

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello   <b>world</b></p>")).toBe("Hello world");
  });

  it("decodes entities after stripping tags", () => {
    expect(stripHtml("<p>Tom &amp; Jerry&#8217;s show</p>")).toBe(
      "Tom & Jerry\u2019s show",
    );
  });
});

describe("truncateSummary", () => {
  it("returns short text unchanged (after HTML stripping)", () => {
    expect(truncateSummary("<p>Short summary</p>")).toBe("Short summary");
  });

  it("truncates long text at a word boundary with an ellipsis", () => {
    const long = "word ".repeat(100).trim();
    const result = truncateSummary(long, 50);
    expect(result.length).toBeLessThanOrEqual(51);
    expect(result.endsWith("…")).toBe(true);
    expect(result.startsWith("word word")).toBe(true);
  });
});

describe("canonicalizeUrl", () => {
  it("strips known tracking params", () => {
    expect(
      canonicalizeUrl(
        "https://example.com/article?utm_source=feed&utm_medium=rss&id=1",
      ),
    ).toBe("https://example.com/article?id=1");
  });

  it("strips trailing slash (except root)", () => {
    expect(canonicalizeUrl("https://example.com/article/")).toBe(
      "https://example.com/article",
    );
    expect(canonicalizeUrl("https://example.com/")).toBe(
      "https://example.com/",
    );
  });

  it("strips URL fragments", () => {
    expect(canonicalizeUrl("https://example.com/article#section")).toBe(
      "https://example.com/article",
    );
  });

  it("falls back to the trimmed raw string for unparsable URLs", () => {
    expect(canonicalizeUrl("  not a url  ")).toBe("not a url");
  });
});

describe("idFromUrl", () => {
  it("is deterministic for the same URL", () => {
    const url = "https://example.com/article";
    expect(idFromUrl(url)).toBe(idFromUrl(url));
  });

  it("differs for different URLs", () => {
    expect(idFromUrl("https://example.com/a")).not.toBe(
      idFromUrl("https://example.com/b"),
    );
  });
});

describe("normalizeTitleKey", () => {
  it("lowercases and strips punctuation for fuzzy comparison", () => {
    expect(normalizeTitleKey("Hello, World!")).toBe(
      normalizeTitleKey("hello world"),
    );
  });
});

describe("normalizeFeedItem", () => {
  const baseOptions = {
    source: "Test Source",
    sourceUrl: "https://example.com/feed",
    category: "ai" as const,
  };

  it("returns null when title, link, or date is missing", () => {
    expect(
      normalizeFeedItem(
        { link: "https://x.com", isoDate: "2026-01-01" },
        baseOptions,
      ),
    ).toBeNull();
    expect(
      normalizeFeedItem({ title: "Foo", isoDate: "2026-01-01" }, baseOptions),
    ).toBeNull();
    expect(
      normalizeFeedItem({ title: "Foo", link: "https://x.com" }, baseOptions),
    ).toBeNull();
  });

  it("returns null for an unparsable date", () => {
    expect(
      normalizeFeedItem(
        { title: "Foo", link: "https://x.com", isoDate: "not-a-date" },
        baseOptions,
      ),
    ).toBeNull();
  });

  it("prefers contentSnippet over summary/content/title for the summary", () => {
    const item = normalizeFeedItem(
      {
        title: "Title",
        link: "https://example.com/a",
        isoDate: "2026-01-01T00:00:00.000Z",
        contentSnippet: "Snippet text",
        summary: "Summary text",
        content: "<p>Content text</p>",
      },
      baseOptions,
    );
    expect(item?.summary).toBe("Snippet text");
  });

  it("falls back to title when no summary fields are present", () => {
    const item = normalizeFeedItem(
      {
        title: "Only A Title",
        link: "https://example.com/b",
        isoDate: "2026-01-01T00:00:00.000Z",
      },
      baseOptions,
    );
    expect(item?.summary).toBe("Only A Title");
  });

  it("decodes HTML entities in the title", () => {
    const item = normalizeFeedItem(
      {
        title: "Debian won&#8217;t ban AI",
        link: "https://example.com/c",
        isoDate: "2026-01-01T00:00:00.000Z",
      },
      baseOptions,
    );
    expect(item?.title).toBe("Debian won\u2019t ban AI");
  });

  it("derives a stable id from the canonical URL", () => {
    const item = normalizeFeedItem(
      {
        title: "Title",
        link: "https://example.com/d?utm_source=feed",
        isoDate: "2026-01-01T00:00:00.000Z",
      },
      baseOptions,
    );
    expect(item?.id).toBe(idFromUrl("https://example.com/d"));
  });

  it("classifies GitHub topics from title/summary keywords when requested", () => {
    const item = normalizeFeedItem(
      {
        title: "GitHub Copilot gets new features",
        link: "https://example.com/e",
        isoDate: "2026-01-01T00:00:00.000Z",
      },
      { ...baseOptions, category: "github", classifyGithubTopics: true },
    );
    expect(item?.githubTopic).toBe("copilot");
  });
});

describe("deduplicateNewsItems", () => {
  function makeItem(overrides: Partial<NewsItem>): NewsItem {
    return {
      id: "id-1",
      title: "Title",
      summary: "Summary",
      url: "https://example.com/a",
      source: "Source A",
      sourceUrl: "https://example.com",
      publishedAt: "2026-01-01T00:00:00.000Z",
      category: "ai",
      tags: [],
      ...overrides,
    };
  }

  it("removes exact duplicate ids, keeping the most recent", () => {
    const items = [
      makeItem({ id: "1", publishedAt: "2026-01-01T00:00:00.000Z" }),
      makeItem({ id: "1", publishedAt: "2026-01-02T00:00:00.000Z" }),
    ];
    const result = deduplicateNewsItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].publishedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("removes near-duplicate titles within the same category", () => {
    const items = [
      makeItem({
        id: "1",
        url: "https://example.com/a",
        title: "Hello, World!",
        publishedAt: "2026-01-01T00:00:00.000Z",
      }),
      makeItem({
        id: "2",
        url: "https://example.com/b",
        title: "hello world",
        publishedAt: "2026-01-02T00:00:00.000Z",
      }),
    ];
    const result = deduplicateNewsItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("keeps same-title items in different categories separate", () => {
    const items = [
      makeItem({ id: "1", url: "https://example.com/a", category: "ai" }),
      makeItem({ id: "2", url: "https://example.com/b", category: "github" }),
    ];
    const result = deduplicateNewsItems(items);
    expect(result).toHaveLength(2);
  });

  it("sorts the result by publishedAt descending", () => {
    const items = [
      makeItem({
        id: "1",
        url: "https://example.com/a",
        title: "First",
        publishedAt: "2026-01-01T00:00:00.000Z",
      }),
      makeItem({
        id: "2",
        url: "https://example.com/b",
        title: "Second",
        publishedAt: "2026-01-03T00:00:00.000Z",
      }),
      makeItem({
        id: "3",
        url: "https://example.com/c",
        title: "Third",
        publishedAt: "2026-01-02T00:00:00.000Z",
      }),
    ];
    const result = deduplicateNewsItems(items);
    expect(result.map((i) => i.id)).toEqual(["2", "3", "1"]);
  });
});
