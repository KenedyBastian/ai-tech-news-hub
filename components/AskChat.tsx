"use client";

import { useState } from "react";
import type { AskAnswer } from "@/lib/copilot/client";

interface TranscriptEntry {
  question: string;
  answer?: AskAnswer;
  error?: string;
}

const SUGGESTED_QUESTIONS = [
  "What's new with GitHub Copilot this week?",
  "Any notable AI model releases recently?",
  "What GitHub Advanced Security updates happened lately?",
];

export function AskChat() {
  const [question, setQuestion] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(false);

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setQuestion("");
    setTranscript((prev) => [...prev, { question: trimmed }]);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Request failed");
      }
      setTranscript((prev) => {
        const next = [...prev];
        next[next.length - 1] = { question: trimmed, answer: data };
        return next;
      });
    } catch (err) {
      setTranscript((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          question: trimmed,
          error:
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.",
        };
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {transcript.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => submit(q)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {transcript.map((entry, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="self-end rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2 text-sm text-white">
              {entry.question}
            </div>
            {entry.error ? (
              <div
                role="alert"
                className="rounded-2xl rounded-bl-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
              >
                {entry.error}
              </div>
            ) : entry.answer ? (
              <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                <p className="whitespace-pre-wrap">{entry.answer.answer}</p>
                {entry.answer.sources.length > 0 ? (
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Sources
                    </p>
                    <ol className="flex flex-col gap-1">
                      {entry.answer.sources.map((source, i) => (
                        <li key={source.url} className="text-xs">
                          <span className="text-slate-400">[{i + 1}]</span>{" "}
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            {source.title}
                          </a>{" "}
                          <span className="text-slate-400">
                            — {source.source}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      entry.answer.mode === "live"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    }`}
                  >
                    {entry.answer.mode === "live"
                      ? `Copilot (${entry.answer.model})`
                      : "Fallback (no Copilot token configured)"}
                  </span>
                  {entry.answer.notice ? (
                    <span>{entry.answer.notice}</span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="w-fit animate-pulse rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                Thinking…
              </div>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(question);
        }}
        className="flex gap-2"
      >
        <label className="flex-1">
          <span className="sr-only">Ask a question</span>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about this week's AI or GitHub news…"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            disabled={loading}
          />
        </label>
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Asking…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
