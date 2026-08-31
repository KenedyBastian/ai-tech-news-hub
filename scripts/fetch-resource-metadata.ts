#!/usr/bin/env tsx
/**
 * Enriches the curated resources list (`data/resources.seed.json`) with
 * live star counts and topics from the public GitHub REST API
 * (`api.github.com`, the only host this script talks to), writing the
 * merged result to `data/resources.json`.
 *
 * Metadata is only included when reliably fetched — if a lookup fails
 * (rate limiting, network error, renamed repo, etc.) the entry is still
 * written out with just its curated name/description/link, no fabricated
 * numbers.
 *
 * Run with: `npm run ingest:resources`
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ResourceDataset, ResourceEntry } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const SEED_PATH = path.join(DATA_DIR, "resources.seed.json");
const OUTPUT_PATH = path.join(DATA_DIR, "resources.json");
const FETCH_TIMEOUT_MS = 10_000;

interface SeedEntry {
  id: string;
  repo: string;
  name: string;
  description: string;
  category: ResourceEntry["category"];
}

async function fetchRepoMetadata(
  repo: string,
): Promise<{ stars: number; topics: string[] } | null> {
  const url = `https://api.github.com/repos/${repo}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "ai-tech-news-hub/1.0 (+https://github.com)",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(`  skip  ${repo}: GitHub API responded ${response.status}`);
      return null;
    }
    const json = (await response.json()) as {
      stargazers_count?: number;
      topics?: string[];
    };
    return {
      stars: json.stargazers_count ?? 0,
      topics: json.topics ?? [],
    };
  } catch (error) {
    console.warn(
      `  skip  ${repo}: ${error instanceof Error ? error.message : error}`,
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const seed = JSON.parse(await readFile(SEED_PATH, "utf-8")) as SeedEntry[];

  const now = new Date().toISOString();
  const entries: ResourceEntry[] = [];

  for (const entry of seed) {
    const metadata = await fetchRepoMetadata(entry.repo);
    entries.push({
      id: entry.id,
      name: entry.name,
      url: `https://github.com/${entry.repo}`,
      description: entry.description,
      category: entry.category,
      ...(metadata
        ? {
            stars: metadata.stars,
            topics: metadata.topics,
            metadataFetchedAt: now,
          }
        : {}),
    });
    if (metadata) {
      console.log(`  ok    ${entry.repo}: ${metadata.stars} stars`);
    }
  }

  const dataset: ResourceDataset = { generatedAt: now, entries };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`);
  console.log(`Wrote ${entries.length} curated resources to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("Resource metadata fetch failed:", error);
  process.exitCode = 1;
});
