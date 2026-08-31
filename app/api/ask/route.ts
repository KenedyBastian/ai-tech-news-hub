import { NextResponse } from "next/server";
import { z } from "zod";
import { loadNewsDataset } from "@/lib/newsStore";
import { askCopilot } from "@/lib/copilot/client";

export const dynamic = "force-dynamic";

const AskRequestSchema = z.object({
  question: z.string().trim().min(3).max(500),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const parsed = AskRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Please provide a `question` string between 3 and 500 characters.",
      },
      { status: 400 },
    );
  }

  try {
    const dataset = await loadNewsDataset();
    const answer = await askCopilot(parsed.data.question, dataset.items);
    return NextResponse.json(answer);
  } catch (error) {
    console.error("Ask endpoint failed:", error);
    return NextResponse.json(
      {
        error:
          "Something went wrong answering that question. Please try again.",
      },
      { status: 500 },
    );
  }
}
