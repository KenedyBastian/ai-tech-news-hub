import type { Category, GithubTopic } from "@/lib/types";

export const CATEGORY_LABELS: Record<Category, string> = {
  ai: "AI",
  github: "GitHub",
  "developer-tools": "Developer Tools",
  security: "Security",
  industry: "Industry",
};

export const CATEGORY_STYLES: Record<Category, string> = {
  ai: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  github: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  "developer-tools":
    "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  security: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  industry:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
};

export const GITHUB_TOPIC_LABELS: Record<GithubTopic, string> = {
  copilot: "Copilot",
  enterprise: "Enterprise",
  "advanced-security": "Advanced Security",
  platform: "Platform & Releases",
  "developer-updates": "Developer Updates",
};

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[category]}`}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}

export function GithubTopicBadge({ topic }: { topic: GithubTopic }) {
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
      {GITHUB_TOPIC_LABELS[topic]}
    </span>
  );
}
