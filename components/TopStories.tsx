import type { NewsItem } from "@/lib/types";
import { CATEGORY_LABELS } from "./CategoryBadge";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Compact "Top N big news" list for the top of the home page. Items are
 * expected to already be sorted newest-first (as `buildNewsResponse` /
 * `queryNewsItems` return them), so this just takes the first `limit`.
 */
export function TopStories({
  items,
  limit = 10,
}: {
  items: NewsItem[];
  limit?: number;
}) {
  const top = items.slice(0, limit);
  if (top.length === 0) return null;

  return (
    <section
      aria-labelledby="top-stories-heading"
      className="mb-10 rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm dark:border-slate-800 dark:from-indigo-950/30 dark:to-slate-900 sm:p-6"
    >
      <h2
        id="top-stories-heading"
        className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"
      >
        <span aria-hidden="true">🔥</span>
        Top {top.length} big stories this week
      </h2>
      <ol className="list-none space-y-3">
        {top.map((item, index) => (
          <li key={item.id} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white dark:bg-indigo-500"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-900 hover:text-indigo-600 hover:underline dark:text-slate-100 dark:hover:text-indigo-400"
              >
                {item.title}
              </a>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium">{item.source}</span>
                <span aria-hidden="true">&middot;</span>
                <span>{CATEGORY_LABELS[item.category]}</span>
                <span aria-hidden="true">&middot;</span>
                <time dateTime={item.publishedAt}>
                  {formatDate(item.publishedAt)}
                </time>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
