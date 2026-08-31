import { z } from "zod";

/**
 * High-level editorial categories used across the site (home page filters,
 * badges, etc). Kept small and stable so URLs/query params stay predictable.
 */
export const CATEGORIES = [
  "ai",
  "github",
  "developer-tools",
  "security",
  "industry",
] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * Fine-grained sub-topics used only for GitHub-related items, so the
 * dedicated GitHub page can offer focused filter chips.
 */
export const GITHUB_TOPICS = [
  "copilot",
  "enterprise",
  "advanced-security",
  "platform",
  "developer-updates",
] as const;
export type GithubTopic = (typeof GITHUB_TOPICS)[number];

export const NewsItemSchema = z.object({
  /** Stable id derived from the canonical URL (sha1, hex). */
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  url: z.string().url(),
  source: z.string().min(1),
  sourceUrl: z.string().url(),
  /** ISO-8601 timestamp. */
  publishedAt: z.string().min(1),
  category: z.enum(CATEGORIES),
  githubTopic: z.enum(GITHUB_TOPICS).optional(),
  tags: z.array(z.string()).default([]),
  /** True when the item came from the bundled fallback/demo dataset. */
  isDemo: z.boolean().optional(),
});
export type NewsItem = z.infer<typeof NewsItemSchema>;

export const NewsDatasetSchema = z.object({
  generatedAt: z.string(),
  /** True if the whole dataset is demo/sample data (no live sources reachable). */
  isDemoDataset: z.boolean().default(false),
  sourceCount: z.number().int().nonnegative().default(0),
  items: z.array(NewsItemSchema),
});
export type NewsDataset = z.infer<typeof NewsDatasetSchema>;

export type DateRange = "week" | "month" | "all";

export interface ResourceEntry {
  id: string;
  name: string;
  url: string;
  description: string;
  category:
    | "ai-learning"
    | "developer-tools-agents"
    | "llm-apps"
    | "security"
    | "platform-engineering";
  /** Only populated when reliably fetched from the GitHub API. */
  stars?: number;
  topics?: string[];
  metadataFetchedAt?: string;
}

export interface ResourceDataset {
  generatedAt: string;
  entries: ResourceEntry[];
}
