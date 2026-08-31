import { loadResourceDataset } from "@/lib/resourceStore";
import type { ResourceEntry } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/StatusStates";

export const revalidate = 3600;
export const metadata = { title: "Resources" };

const CATEGORY_META: Record<
  ResourceEntry["category"],
  { title: string; description: string }
> = {
  "ai-learning": {
    title: "AI Learning",
    description: "Curricula, cookbooks, and guides for learning modern AI.",
  },
  "developer-tools-agents": {
    title: "Developer Tools & Agents",
    description: "Agent frameworks and AI-native developer tooling.",
  },
  "llm-apps": {
    title: "LLM Apps",
    description: "Frameworks and SDKs for building LLM-powered applications.",
  },
  security: {
    title: "Security",
    description:
      "Static analysis, scanning, and application-security guidance.",
  },
  "platform-engineering": {
    title: "Platform Engineering",
    description: "Developer portals, GitOps, and infrastructure-as-code.",
  },
};

const CATEGORY_ORDER: ResourceEntry["category"][] = [
  "ai-learning",
  "developer-tools-agents",
  "llm-apps",
  "security",
  "platform-engineering",
];

function formatStars(stars: number): string {
  if (stars >= 1000) return `${(stars / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(stars);
}

function ResourceCard({ entry }: { entry: ResourceEntry }) {
  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {entry.name}
          </h3>
          {typeof entry.stars === "number" ? (
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              ★ {formatStars(entry.stars)}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {entry.description}
        </p>
        {entry.topics && entry.topics.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {entry.topics.slice(0, 5).map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              >
                {topic}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <span className="mt-4 text-xs font-medium text-indigo-600 dark:text-indigo-400">
        View on GitHub ↗
      </span>
    </a>
  );
}

export default async function ResourcesPage() {
  let dataset;
  try {
    dataset = await loadResourceDataset();
  } catch {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <ErrorState message="Resource data hasn't been generated yet. Run `npm run ingest:resources` locally." />
      </div>
    );
  }

  if (dataset.entries.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <EmptyState title="No resources yet" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <section className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Curated resources
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
          Reputable, popular GitHub repositories for learning AI, building
          agents and LLM apps, securing software, and platform engineering. Star
          counts are fetched live from the GitHub API when available.
        </p>
      </section>

      <div className="flex flex-col gap-10">
        {CATEGORY_ORDER.map((category) => {
          const entries = dataset.entries.filter(
            (entry) => entry.category === category,
          );
          if (entries.length === 0) return null;
          return (
            <section key={category}>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {CATEGORY_META[category].title}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {CATEGORY_META[category].description}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => (
                  <ResourceCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
