import type { Category, DateRange, GithubTopic, NewsItem } from "./types";
import { filterByDateRange } from "./dateRange";

export interface NewsQueryParams {
  category?: Category;
  githubTopic?: GithubTopic;
  q?: string;
  range?: DateRange;
}

/** Simple, dependency-free full-text match across title/summary/source/tags. */
function matchesQuery(item: NewsItem, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [item.title, item.summary, item.source, ...item.tags]
    .join(" ")
    .toLowerCase();
  return needle
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

/**
 * Pure, side-effect-free query function over an in-memory news dataset.
 * Kept separate from file I/O so it can be unit tested directly.
 */
export function queryNewsItems(
  items: NewsItem[],
  params: NewsQueryParams,
  reference: Date = new Date(),
): NewsItem[] {
  const range = params.range ?? "week";
  let results = filterByDateRange(items, range, reference);

  if (params.category) {
    results = results.filter((item) => item.category === params.category);
  }
  if (params.githubTopic) {
    results = results.filter((item) => item.githubTopic === params.githubTopic);
  }
  if (params.q) {
    results = results.filter((item) => matchesQuery(item, params.q!));
  }

  return results.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/**
 * Home page needs a graceful fallback: if the strict "this week" window is
 * empty (e.g. fresh clone with stale bundled data, or a quiet news week),
 * widen to the most recent N items instead of showing a hard empty state.
 */
export function withFallbackWindow(
  items: NewsItem[],
  primary: NewsItem[],
  minimumCount = 6,
): { results: NewsItem[]; widened: boolean } {
  if (primary.length >= minimumCount || items.length === 0) {
    return { results: primary, widened: false };
  }
  const widened = [...items]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, minimumCount);
  return { results: widened, widened: true };
}

export interface NewsResponsePayload {
  items: NewsItem[];
  total: number;
  widened: boolean;
  range: DateRange;
}

/**
 * Full request-shaping logic used by `/api/news` and the home/GitHub pages:
 * applies category/topic/search filters (ignoring the date range) to know
 * the true match count, applies the date range on top for the "primary"
 * result set, and — only when there's no free-text search — widens to the
 * most recent items if the primary window is too sparse, so filtered pages
 * are never surprisingly empty on a quiet news day.
 */
export function buildNewsResponse(
  items: NewsItem[],
  params: NewsQueryParams,
  reference: Date = new Date(),
  minimumCount = 6,
): NewsResponsePayload {
  const range = params.range ?? "week";
  const allMatching = queryNewsItems(
    items,
    { ...params, range: "all" },
    reference,
  );
  const primary = queryNewsItems(items, params, reference);

  if (params.q) {
    return { items: primary, total: allMatching.length, widened: false, range };
  }

  const { results, widened } = withFallbackWindow(
    allMatching,
    primary,
    minimumCount,
  );
  return { items: results, total: allMatching.length, widened, range };
}
