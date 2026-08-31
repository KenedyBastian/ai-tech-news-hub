export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 sm:px-6">
        <p>
          Aggregated from public RSS feeds and the GitHub API. Every headline
          links back to its original source — always read the full story there.
        </p>
        <p>
          Open source on{" "}
          <a
            href="https://github.com"
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            GitHub
          </a>{" "}
          &middot; MIT licensed &middot; refreshed automatically on a daily
          schedule.
        </p>
      </div>
    </footer>
  );
}
