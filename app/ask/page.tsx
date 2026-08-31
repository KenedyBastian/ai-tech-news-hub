import { AskChat } from "@/components/AskChat";

export const metadata = { title: "Ask" };

export default function AskPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Ask about recent tech news
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Ask a natural-language question and get an answer grounded in the
          articles this hub has collected, powered by the official GitHub
          Copilot SDK. Every answer links back to its sources.
        </p>
      </section>
      <AskChat />
    </div>
  );
}
