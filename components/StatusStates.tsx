export function NewsCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mb-2 h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mb-1 h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mb-1 h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mt-4 h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading news"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <NewsCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function EmptyState({
  title = "No stories match your filters",
  description = "Try a different search term, category, or a wider date range.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
      <p className="text-4xl" aria-hidden>
        🗞️
      </p>
      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong loading the news.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-6 py-16 text-center dark:border-rose-900 dark:bg-rose-950/40"
    >
      <p className="text-4xl" aria-hidden>
        ⚠️
      </p>
      <h3 className="mt-4 text-lg font-semibold text-rose-900 dark:text-rose-200">
        Couldn&apos;t load news
      </h3>
      <p className="mt-2 max-w-md text-sm text-rose-700 dark:text-rose-300">
        {message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
