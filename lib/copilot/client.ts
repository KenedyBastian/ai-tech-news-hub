import { prompt } from "@copilot-extensions/preview-sdk";
import type { NewsItem } from "../types";
import { buildContextBlock, rankRelevantItems } from "./grounding";

export interface AskSource {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

export interface AskAnswer {
  answer: string;
  sources: AskSource[];
  /**
   * "live" — answered by the real GitHub Copilot chat-completions API via
   * the official SDK. "fallback" — no Copilot token configured, so we
   * returned a deterministic extractive summary of the grounding articles
   * instead of fabricating a model response.
   */
  mode: "live" | "fallback";
  model: string | null;
  notice?: string;
}

const DEFAULT_MODEL = process.env.COPILOT_API_MODEL?.trim() || "gpt-4o";
// The real GitHub Copilot chat-completions endpoint used by Copilot
// Extensions/agents. Can be overridden (e.g. to point at the GitHub Models
// inference endpoint) for environments that only have a plain PAT — see
// README "Ask page setup" for details.
const DEFAULT_ENDPOINT = "https://api.githubcopilot.com/chat/completions";

function getToken(): string | undefined {
  return (
    process.env.COPILOT_API_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim()
  );
}

export function isCopilotConfigured(): boolean {
  return Boolean(getToken());
}

const SYSTEM_PROMPT = `You are the "Ask" assistant for an AI & technology news hub website.
Answer the user's question using ONLY the numbered articles provided in the context below,
which were collected from the site's own recent news dataset. Rules:
- Cite every claim with the matching [n] reference number(s).
- If the context does not contain enough information to answer, say so plainly instead of guessing.
- Keep answers concise (a few sentences to a short paragraph) and factual.
- Never invent article titles, dates, or URLs beyond what is given.`;

function extractiveFallback(question: string, sources: AskSource[]): string {
  if (sources.length === 0) {
    return "I couldn't find any recent articles in the local dataset that relate to that question. Try rephrasing, or check back once the news feed has refreshed.";
  }
  const bullets = sources
    .map(
      (s, i) =>
        `${i + 1}. ${s.title} (${s.source}, ${new Date(s.publishedAt).toISOString().slice(0, 10)}) [${i + 1}]`,
    )
    .join("\n");
  return (
    `Copilot isn't configured on this deployment, so here are the most relevant recent articles for "${question.trim()}" ` +
    `from the local dataset instead of a generated answer:\n\n${bullets}`
  );
}

/**
 * Answers a natural-language question about recent tech/AI news, grounded in
 * the locally collected dataset. Uses the official `@copilot-extensions/preview-sdk`
 * `prompt()` helper against the GitHub Copilot chat-completions API when a
 * token is configured; otherwise returns a deterministic extractive summary
 * of the most relevant articles so the page is still useful without secrets.
 */
export async function askCopilot(
  question: string,
  allItems: NewsItem[],
): Promise<AskAnswer> {
  const ranked = rankRelevantItems(question, allItems, 6);
  const sources: AskSource[] = ranked.map(({ item }) => ({
    title: item.title,
    url: item.url,
    source: item.source,
    publishedAt: item.publishedAt,
  }));

  const token = getToken();
  if (!token) {
    return {
      answer: extractiveFallback(question, sources),
      sources,
      mode: "fallback",
      model: null,
      notice:
        "Set COPILOT_API_TOKEN (or GITHUB_TOKEN) to enable live Copilot-generated answers. See README for setup.",
    };
  }

  const contextBlock = buildContextBlock(ranked);
  const endpoint = process.env.COPILOT_API_ENDPOINT?.trim() || DEFAULT_ENDPOINT;

  try {
    const { message } = await prompt({
      model: DEFAULT_MODEL,
      token,
      endpoint,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Context articles:\n\n${contextBlock}\n\nQuestion: ${question}`,
        },
      ],
      request: {
        // Custom User-Agent so upstream logs can attribute traffic to this app.
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, {
            ...init,
            headers: {
              ...init?.headers,
              "User-Agent": "ai-tech-news-hub/1.0 (+https://github.com)",
            },
          }),
      },
    });

    return {
      answer:
        typeof message?.content === "string" && message.content.trim()
          ? message.content.trim()
          : extractiveFallback(question, sources),
      sources,
      mode: "live",
      model: DEFAULT_MODEL,
    };
  } catch (error) {
    return {
      answer: extractiveFallback(question, sources),
      sources,
      mode: "fallback",
      model: null,
      notice: `The Copilot API call failed (${
        error instanceof Error ? error.message : "unknown error"
      }); showing relevant articles instead.`,
    };
  }
}
