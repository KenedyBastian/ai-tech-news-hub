import type { NewsItem } from "../types";

export interface GroundingResult {
  item: NewsItem;
  score: number;
}

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "in",
  "on",
  "for",
  "to",
  "and",
  "is",
  "are",
  "what",
  "whats",
  "how",
  "does",
  "do",
  "did",
  "was",
  "were",
  "with",
  "about",
  "any",
  "latest",
  "new",
  "news",
  "recent",
  "there",
  "has",
  "have",
  "this",
  "week",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

/**
 * Ranks news items by simple term-overlap relevance to a natural-language
 * question. Deliberately dependency-free (no external embeddings/API calls)
 * so grounding works offline and deterministically; good enough for a
 * few hundred locally-collected articles.
 */
export function rankRelevantItems(
  question: string,
  items: NewsItem[],
  topK = 6,
): GroundingResult[] {
  const queryTerms = tokenize(question);
  if (queryTerms.length === 0) {
    return items
      .slice()
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, topK)
      .map((item) => ({ item, score: 0 }));
  }

  const scored = items.map((item) => {
    const haystack = tokenize(
      `${item.title} ${item.summary} ${item.source} ${item.tags.join(" ")} ${item.category} ${item.githubTopic ?? ""}`,
    );
    const haystackSet = new Set(haystack);
    let termScore = 0;
    for (const term of queryTerms) {
      if (haystackSet.has(term)) termScore += 1;
      // Reward title matches more heavily than body matches.
      if (item.title.toLowerCase().includes(term)) termScore += 1.5;
    }
    // Mild recency boost so ties favor fresher articles. Only applied to
    // items that already matched at least one term — otherwise every
    // recently-published item would leak into the results regardless of
    // relevance.
    let score = termScore;
    if (termScore > 0) {
      const ageDays =
        (Date.now() - new Date(item.publishedAt).getTime()) / 86_400_000;
      score += Math.max(0, 1 - ageDays / 14) * 0.5;
    }
    return { item, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/** Builds the grounding context block injected into the system prompt. */
export function buildContextBlock(results: GroundingResult[]): string {
  if (results.length === 0) {
    return "No matching articles were found in the local dataset.";
  }
  return results
    .map(({ item }, index) => {
      const date = new Date(item.publishedAt).toISOString().slice(0, 10);
      return `[${index + 1}] "${item.title}" — ${item.source}, ${date}\nSummary: ${item.summary}\nURL: ${item.url}`;
    })
    .join("\n\n");
}
