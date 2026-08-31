#!/usr/bin/env tsx
/**
 * Ingestion pipeline: fetches allowlisted RSS/Atom feeds and GitHub Releases
 * for a curated set of repos, normalizes + de-duplicates the results, tops
 * up with bundled demo data only if live results are too sparse, and writes
 * `data/news.json` for the app to read at request time.
 *
 * Run with: `npm run ingest`
 * Safe to run repeatedly (idempotent) and safe to run without network
 * access or credentials (falls back to demo data).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import Parser from "rss-parser";
import {
  FEED_SOURCES,
  GITHUB_RELEASE_SOURCES,
  ALLOWED_FETCH_HOSTS,
} from "../lib/sources";
import { deduplicateNewsItems, normalizeFeedItem } from "../lib/normalize";
import type { NewsDataset, NewsItem } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const OUTPUT_PATH = path.join(DATA_DIR, "news.json");
const DEMO_SEED_PATH = path.join(DATA_DIR, "demo-seed.json");

const FETCH_TIMEOUT_MS = 15_000;
const MAX_ITEMS_PER_FEED = 20;
const RETENTION_DAYS = 45;
const MINIMUM_LIVE_ITEMS = 5;

const rssParser = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    "User-Agent":
      "ai-tech-news-hub/1.0 (+https://github.com; RSS ingestion bot)",
  },
});

function assertAllowedHost(url: string) {
  const hostname = new URL(url).hostname;
  if (!ALLOWED_FETCH_HOSTS.has(hostname)) {
    throw new Error(`Refusing to fetch non-allowlisted host: ${hostname}`);
  }
}

async function fetchWithTimeout(url: string, headers: Record<string, string>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

interface IngestLogEntry {
  source: string;
  status: "ok" | "error";
  count: number;
  detail?: string;
}

async function ingestFeedSource(
  source: (typeof FEED_SOURCES)[number],
): Promise<{ items: NewsItem[]; log: IngestLogEntry }> {
  try {
    assertAllowedHost(source.feedUrl);
    const feed = await rssParser.parseURL(source.feedUrl);
    const rawItems = (feed.items ?? []).slice(0, MAX_ITEMS_PER_FEED);
    const items = rawItems
      .map((raw) =>
        normalizeFeedItem(raw, {
          source: source.name,
          sourceUrl: source.homepage,
          category: source.category,
          classifyGithubTopics: source.category === "github",
        }),
      )
      .filter((item): item is NewsItem => item !== null);
    return {
      items,
      log: { source: source.name, status: "ok", count: items.length },
    };
  } catch (error) {
    return {
      items: [],
      log: {
        source: source.name,
        status: "error",
        count: 0,
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function ingestGithubReleases(
  source: (typeof GITHUB_RELEASE_SOURCES)[number],
): Promise<{ items: NewsItem[]; log: IngestLogEntry }> {
  const apiUrl = `https://api.github.com/repos/${source.repo}/releases?per_page=${MAX_ITEMS_PER_FEED}`;
  try {
    assertAllowedHost(apiUrl);
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "ai-tech-news-hub/1.0 (+https://github.com)",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const response = await fetchWithTimeout(apiUrl, headers);
    if (!response.ok) {
      throw new Error(`GitHub API responded ${response.status}`);
    }
    const releases = (await response.json()) as Array<{
      name?: string | null;
      tag_name?: string;
      html_url?: string;
      published_at?: string | null;
      created_at?: string;
      body?: string | null;
      draft?: boolean;
      prerelease?: boolean;
    }>;

    const items = releases
      .filter((release) => !release.draft)
      .map((release) =>
        normalizeFeedItem(
          {
            title:
              `${source.name.replace(" Releases", "")} ${release.tag_name ?? release.name ?? ""}`.trim(),
            summary: release.body ?? release.name ?? release.tag_name ?? "",
            link: release.html_url,
            isoDate: release.published_at ?? release.created_at,
          },
          {
            source: source.name,
            sourceUrl: source.homepage,
            category: source.category,
            githubTopic: source.githubTopic,
            tags: release.prerelease ? ["prerelease"] : [],
          },
        ),
      )
      .filter((item): item is NewsItem => item !== null);

    return {
      items,
      log: { source: source.name, status: "ok", count: items.length },
    };
  } catch (error) {
    return {
      items: [],
      log: {
        source: source.name,
        status: "error",
        count: 0,
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

interface DemoSeedEntry {
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceUrl: string;
  category: NewsItem["category"];
  githubTopic?: NewsItem["githubTopic"];
  tags?: string[];
  daysAgo: number;
}

async function loadDemoItems(): Promise<NewsItem[]> {
  const raw = await readFile(DEMO_SEED_PATH, "utf-8");
  const entries = JSON.parse(raw) as DemoSeedEntry[];
  const now = Date.now();
  return entries.map((entry) => {
    const publishedAt = new Date(
      now - entry.daysAgo * 24 * 60 * 60 * 1000,
    ).toISOString();
    return normalizeFeedItem(
      {
        title: entry.title,
        summary: entry.summary,
        link: entry.url,
        isoDate: publishedAt,
      },
      {
        source: entry.source,
        sourceUrl: entry.sourceUrl,
        category: entry.category,
        githubTopic: entry.githubTopic,
        tags: entry.tags,
        isDemo: true,
      },
    )!;
  });
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const feedResults = await Promise.all(FEED_SOURCES.map(ingestFeedSource));
  const releaseResults = await Promise.all(
    GITHUB_RELEASE_SOURCES.map(ingestGithubReleases),
  );

  const allResults = [...feedResults, ...releaseResults];
  const liveItems = allResults.flatMap((result) => result.items);
  const logs = allResults.map((result) => result.log);

  const successfulSources = logs.filter((log) => log.status === "ok").length;
  const totalSources = logs.length;

  let finalItems = deduplicateNewsItems(liveItems);
  let isDemoDataset = false;

  if (finalItems.length === 0) {
    // Total live-fetch failure (e.g. no network access): ship demo data so
    // the site is never empty, and clearly flag the whole dataset as demo.
    finalItems = deduplicateNewsItems(await loadDemoItems());
    isDemoDataset = true;
  } else if (finalItems.length < MINIMUM_LIVE_ITEMS) {
    // Partial success: top up with demo items (individually flagged) so the
    // home page isn't sparse, without hiding which items are real.
    const demoItems = await loadDemoItems();
    finalItems = deduplicateNewsItems([...finalItems, ...demoItems]);
  }

  // Bound the retained history so the committed JSON file stays small.
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  finalItems = finalItems.filter(
    (item) => new Date(item.publishedAt).getTime() >= cutoff,
  );
  finalItems.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const dataset: NewsDataset = {
    generatedAt: new Date().toISOString(),
    isDemoDataset,
    sourceCount: successfulSources,
    items: finalItems,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`);

  console.log(
    `Ingested ${finalItems.length} items from ${successfulSources}/${totalSources} sources` +
      (isDemoDataset ? " (demo dataset — no sources reachable)" : ""),
  );
  for (const log of logs) {
    if (log.status === "ok") {
      console.log(`  ok    ${log.source}: ${log.count} items`);
    } else {
      console.warn(`  error ${log.source}: ${log.detail}`);
    }
  }
}

main().catch((error) => {
  console.error("Ingestion failed:", error);
  process.exitCode = 1;
});
