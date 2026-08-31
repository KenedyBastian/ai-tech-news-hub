"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, DateRange, GithubTopic, NewsItem } from "@/lib/types";
import { NewsCard } from "./NewsCard";
import { CATEGORY_LABELS, GITHUB_TOPIC_LABELS } from "./CategoryBadge";
import { EmptyState, ErrorState, LoadingGrid } from "./StatusStates";

const RANGE_LABELS: Record<DateRange, string> = {
  week: "This week",
  month: "This month",
  all: "All time",
};

const CATEGORY_OPTIONS: Category[] = [
  "ai",
  "github",
  "developer-tools",
  "security",
  "industry",
];

export interface NewsExplorerProps {
  initialItems: NewsItem[];
  initialTotal: number;
  initialWidened: boolean;
  initialRange: DateRange;
  generatedAt: string;
  isDemoDataset: boolean;
  /** When set, the category filter is hidden and always fixed to this value. */
  lockedCategory?: Category;
  /** When set, shows GitHub sub-topic filter chips (only used on /github). */
  githubTopics?: GithubTopic[];
  emptyTitle?: string;
}

interface FetchResult {
  items: NewsItem[];
  total: number;
  widened: boolean;
  range: DateRange;
  generatedAt: string;
  isDemoDataset: boolean;
}

export function NewsExplorer({
  initialItems,
  initialTotal,
  initialWidened,
  initialRange,
  generatedAt,
  isDemoDataset,
  lockedCategory,
  githubTopics,
  emptyTitle,
}: NewsExplorerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">(
    lockedCategory ?? "all",
  );
  const [githubTopic, setGithubTopic] = useState<GithubTopic | "all">("all");
  const [range, setRange] = useState<DateRange>(initialRange);

  const [result, setResult] = useState<FetchResult>({
    items: initialItems,
    total: initialTotal,
    widened: initialWidened,
    range: initialRange,
    generatedAt,
    isDemoDataset,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current && retryToken === 0) {
      hasMounted.current = true;
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (category !== "all") params.set("category", category);
        if (githubTopic !== "all") params.set("githubTopic", githubTopic);
        if (query.trim()) params.set("q", query.trim());
        params.set("range", range);

        const response = await fetch(`/api/news?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data = (await response.json()) as FetchResult;
        setResult(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load news. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query, category, githubTopic, range, retryToken]);

  const lastUpdated = useMemo(() => {
    try {
      return new Date(result.generatedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return result.generatedAt;
    }
  }, [result.generatedAt]);

  function retry() {
    setError(null);
    setRetryToken((token) => token + 1);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative flex-1 sm:max-w-sm">
            <span className="sr-only">Search news</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search headlines, sources, tags…"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>

          <div
            role="group"
            aria-label="Date range"
            className="flex gap-1 rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {(Object.keys(RANGE_LABELS) as DateRange[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRange(option)}
                aria-pressed={range === option}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === option
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {RANGE_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        {!lockedCategory ? (
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={category === "all"}
              onClick={() => setCategory("all")}
              label="All categories"
            />
            {CATEGORY_OPTIONS.map((option) => (
              <FilterChip
                key={option}
                active={category === option}
                onClick={() => setCategory(option)}
                label={CATEGORY_LABELS[option]}
              />
            ))}
          </div>
        ) : null}

        {githubTopics && githubTopics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={githubTopic === "all"}
              onClick={() => setGithubTopic("all")}
              label="All GitHub topics"
            />
            {githubTopics.map((topic) => (
              <FilterChip
                key={topic}
                active={githubTopic === topic}
                onClick={() => setGithubTopic(topic)}
                label={GITHUB_TOPIC_LABELS[topic]}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>Data refreshed {lastUpdated}</span>
          {result.isDemoDataset ? (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              Showing demo data — live feeds haven&apos;t been ingested yet.
            </span>
          ) : null}
          {result.widened ? (
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              No stories matched &ldquo;{RANGE_LABELS[range]}&rdquo; for this
              filter, so we&apos;re showing the most recent instead.
            </span>
          ) : null}
        </div>
      </div>

      {loading ? (
        <LoadingGrid />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : result.items.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}
