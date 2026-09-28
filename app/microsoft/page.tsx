import { loadNewsDataset } from "@/lib/newsStore";
import { buildNewsResponse } from "@/lib/newsQuery";
import { NewsExplorer } from "@/components/NewsExplorer";
import { ErrorState } from "@/components/StatusStates";

export const revalidate = 300;
export const metadata = { title: "Microsoft" };

const MICROSOFT_TAG = "microsoft";

export default async function MicrosoftPage() {
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

  const payload = buildNewsResponse(dataset.items, {
    tag: MICROSOFT_TAG,
    range: "week",
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Microsoft company news
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
          Everything from Microsoft the company — AI research and product
          announcements, the Official Microsoft Blog, Azure, and Microsoft 365 —
          sourced directly from Microsoft&apos;s own official blogs. Use the
          category filters below to narrow to AI, Cloud/Developer Tools, or
          general company/industry news.
        </p>
      </section>

      <NewsExplorer
        initialItems={payload.items}
        initialTotal={payload.total}
        initialWidened={payload.widened}
        initialRange={payload.range}
        generatedAt={dataset.generatedAt}
        isDemoDataset={dataset.isDemoDataset}
        lockedTag={MICROSOFT_TAG}
        emptyTitle="No Microsoft updates yet for this view"
      />
    </div>
  );
}
