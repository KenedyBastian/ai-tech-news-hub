import { NextResponse } from "next/server";
import { loadNewsDataset } from "@/lib/newsStore";
import { buildNewsResponse } from "@/lib/newsQuery";
import {
  CATEGORIES,
  GITHUB_TOPICS,
  type Category,
  type DateRange,
  type GithubTopic,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function parseCategory(value: string | null): Category | undefined {
  return value && (CATEGORIES as readonly string[]).includes(value)
    ? (value as Category)
    : undefined;
}

function parseGithubTopic(value: string | null): GithubTopic | undefined {
  return value && (GITHUB_TOPICS as readonly string[]).includes(value)
    ? (value as GithubTopic)
    : undefined;
}

function parseRange(value: string | null): DateRange {
  return value === "month" || value === "all" ? value : "week";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const dataset = await loadNewsDataset();
    const payload = buildNewsResponse(dataset.items, {
      category: parseCategory(searchParams.get("category")),
      githubTopic: parseGithubTopic(searchParams.get("githubTopic")),
      q: searchParams.get("q")?.slice(0, 200) || undefined,
      range: parseRange(searchParams.get("range")),
    });

    return NextResponse.json({
      ...payload,
      generatedAt: dataset.generatedAt,
      isDemoDataset: dataset.isDemoDataset,
    });
  } catch (error) {
    console.error("Failed to load news dataset:", error);
    return NextResponse.json(
      {
        error:
          "News data is unavailable right now. Try again shortly, or run `npm run ingest` locally.",
      },
      { status: 500 },
    );
  }
}
