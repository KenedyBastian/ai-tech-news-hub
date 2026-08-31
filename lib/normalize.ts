import { createHash } from "node:crypto";
import type { Category, GithubTopic, NewsItem } from "./types";
import { classifyGithubTopic } from "./sources";

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201d",
  ldquo: "\u201c",
};

/** Decodes common numeric and named HTML entities found in RSS/Atom feeds. */
export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    .replace(
      /&([a-zA-Z]+);/g,
      (match, name: string) => NAMED_ENTITIES[name] ?? match,
    );
}

/** Strips HTML tags and collapses whitespace, e.g. for RSS summaries. */
export function stripHtml(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncates a plain-text summary to a reasonable card-friendly length. */
export function truncateSummary(input: string, maxLength = 240): string {
  const clean = stripHtml(input);
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength).trim()}…`;
}

/** Removes tracking query params and trailing slashes for stable de-duping. */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const stripParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "ref",
      "source",
    ];
    for (const param of stripParams) url.searchParams.delete(param);
    url.hash = "";
    let href = url.toString();
    if (href.endsWith("/") && url.pathname !== "/") href = href.slice(0, -1);
    return href;
  } catch {
    return rawUrl.trim();
  }
}

export function idFromUrl(canonicalUrl: string): string {
  return createHash("sha1").update(canonicalUrl).digest("hex");
}

/** Normalizes a title/whitespace for near-duplicate comparisons. */
export function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export interface RawFeedItem {
  title?: string;
  summary?: string;
  contentSnippet?: string;
  content?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
}

export interface NormalizeOptions {
  source: string;
  sourceUrl: string;
  category: Category;
  /** When set, all items from this source are tagged with this GitHub topic. */
  githubTopic?: GithubTopic;
  /** When true, classify githubTopic from title/summary keywords instead. */
  classifyGithubTopics?: boolean;
  tags?: string[];
  isDemo?: boolean;
}

/**
 * Converts a raw RSS/Atom item (as parsed by `rss-parser`) into our
 * normalized {@link NewsItem} shape. Returns `null` for entries missing the
 * minimum required fields (title, link, date).
 */
export function normalizeFeedItem(
  raw: RawFeedItem,
  options: NormalizeOptions,
): NewsItem | null {
  const title = raw.title ? decodeHtmlEntities(raw.title).trim() : undefined;
  const link = raw.link?.trim();
  const dateStr = raw.isoDate ?? raw.pubDate;
  if (!title || !link || !dateStr) return null;

  const publishedAt = new Date(dateStr);
  if (Number.isNaN(publishedAt.getTime())) return null;

  const url = canonicalizeUrl(link);
  const summarySource =
    raw.contentSnippet?.trim() ||
    raw.summary?.trim() ||
    raw.content?.trim() ||
    title;
  const summary = truncateSummary(summarySource);

  const githubTopic =
    options.category === "github"
      ? (options.githubTopic ??
        (options.classifyGithubTopics
          ? classifyGithubTopic(`${title} ${summarySource}`)
          : undefined))
      : undefined;

  return {
    id: idFromUrl(url),
    title,
    summary,
    url,
    source: options.source,
    sourceUrl: options.sourceUrl,
    publishedAt: publishedAt.toISOString(),
    category: options.category,
    githubTopic,
    tags: options.tags ?? [],
    isDemo: options.isDemo,
  };
}

/**
 * De-duplicates news items by canonical URL id first, then by a normalized
 * title fingerprint (keeping the earliest-seen / most-recently-published
 * duplicate) so the same story from two feeds doesn't appear twice.
 */
export function deduplicateNewsItems(items: NewsItem[]): NewsItem[] {
  const byId = new Map<string, NewsItem>();
  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing || item.publishedAt > existing.publishedAt) {
      byId.set(item.id, item);
    }
  }

  const byTitleKey = new Map<string, NewsItem>();
  for (const item of byId.values()) {
    const key = `${item.category}:${normalizeTitleKey(item.title)}`;
    const existing = byTitleKey.get(key);
    if (!existing || item.publishedAt > existing.publishedAt) {
      byTitleKey.set(key, item);
    }
  }

  return Array.from(byTitleKey.values()).sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}
