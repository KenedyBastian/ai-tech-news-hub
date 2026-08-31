import { loadNewsDataset } from "@/lib/newsStore";
import { buildNewsResponse } from "@/lib/newsQuery";
import { NewsExplorer } from "@/components/NewsExplorer";
import { ErrorState } from "@/components/StatusStates";
import { TopStories } from "@/components/TopStories";

export const revalidate = 300;

export default async function HomePage() {
  let dataset;
  try {
    dataset = await loadNewsDataset();
  } catch {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <ErrorState message="News data hasn't been generated yet. Run `npm run ingest` locally, or wait for the next scheduled refresh." />
      </div>
    );
  }

  const payload = buildNewsResponse(dataset.items, { range: "week" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          This week in AI &amp; technology
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
          A consolidated, source-linked view of the AI and developer-tooling
          news that matters, refreshed automatically from official blogs,
          reputable publications, and the GitHub API. Search, filter, and jump
          straight to the original story.
        </p>
      </section>

      <TopStories items={payload.items} limit={10} />

      <NewsExplorer
        initialItems={payload.items}
        initialTotal={payload.total}
        initialWidened={payload.widened}
        initialRange={payload.range}
        generatedAt={dataset.generatedAt}
        isDemoDataset={dataset.isDemoDataset}
        emptyTitle="No stories yet for this view"
      />
    </div>
  );
}
