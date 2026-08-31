import type { NewsItem } from "@/lib/types";
import { CategoryBadge, GithubTopicBadge } from "./CategoryBadge";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="group flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <CategoryBadge category={item.category} />
          {item.githubTopic ? (
            <GithubTopicBadge topic={item.githubTopic} />
          ) : null}
          {item.isDemo ? (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Demo data
            </span>
          ) : null}
        </div>
        <h3 className="text-base font-semibold leading-snug text-slate-900 dark:text-white">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {item.title}
          </a>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
          {item.summary}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium">{item.source}</span>
        <div className="flex items-center gap-3">
          <time dateTime={item.publishedAt}>
            {formatDate(item.publishedAt)}
          </time>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Read source ↗
          </a>
        </div>
      </div>
    </article>
  );
}
