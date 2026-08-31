import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NewsDatasetSchema, type NewsDataset } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "news.json");

let cached: { dataset: NewsDataset; loadedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

/**
 * Loads the generated news dataset (`data/news.json`) from disk, validating
 * its shape with zod. Cached in-memory for a minute to avoid re-parsing on
 * every request in a long-running server process; `force` bypasses that.
 */
export async function loadNewsDataset(force = false): Promise<NewsDataset> {
  if (!force && cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.dataset;
  }
  const raw = await readFile(DATA_PATH, "utf-8");
  const parsed = NewsDatasetSchema.parse(JSON.parse(raw));
  cached = { dataset: parsed, loadedAt: Date.now() };
  return parsed;
}
