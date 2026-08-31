import { loadNewsDataset } from "@/lib/newsStore";
import { buildNewsResponse } from "@/lib/newsQuery";
import { NewsExplorer } from "@/components/NewsExplorer";
import { ErrorState } from "@/components/StatusStates";
import { GITHUB_TOPICS } from "@/lib/types";

export const revalidate = 300;
export const metadata = { title: "GitHub" };

export default async function GithubPage() {
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
    category: "github",
    range: "week",
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          GitHub platform &amp; Copilot updates
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
          Focused tracking of GitHub Copilot, GitHub Enterprise, GitHub Advanced
          Security, platform &amp; release notes, and related developer updates
          — sourced from the official GitHub Blog, Changelog, and Releases API.
        </p>
      </section>

      <NewsExplorer
        initialItems={payload.items}
        initialTotal={payload.total}
        initialWidened={payload.widened}
        initialRange={payload.range}
        generatedAt={dataset.generatedAt}
        isDemoDataset={dataset.isDemoDataset}
        lockedCategory="github"
        githubTopics={[...GITHUB_TOPICS]}
        emptyTitle="No GitHub updates yet for this view"
      />
    </div>
  );
}
