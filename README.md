# AI & Tech News Hub

A polished, consolidated news hub for the fast-moving AI and developer
landscape — this week's noteworthy AI/tech news, a dedicated GitHub updates
feed (Copilot, Enterprise, Advanced Security, Platform, Developer updates), a
Copilot-powered "Ask" page grounded in the site's own dataset, and a curated
list of reputable GitHub repositories for learning and building.

Every article links back to its original source (blog post, changelog entry,
or release notes) — nothing here is paraphrased-only or link-free.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Data pipeline & daily refresh](#data-pipeline--daily-refresh)
- [Architecture](#architecture)
- [Ask page: GitHub Copilot integration](#ask-page-github-copilot-integration)
- [Testing, linting, formatting](#testing-linting-formatting)
- [Deployment](#deployment)
- [Known trade-offs](#known-trade-offs)
- [License](#license)

## Features

1. **Home page** — a responsive grid of this week's AI/tech news with search,
   category filters, and a graceful widen-to-recent fallback when a filtered
   view would otherwise be empty. Every card shows source, publish date,
   category, a concise summary, and a "Read source ↗" link to the original
   article.
2. **GitHub page** (`/github`) — the same experience, locked to GitHub-related
   news and further split into **Copilot**, **Enterprise**, **Advanced
   Security**, **Platform**, and **Developer updates** sub-topics.
3. **Ask page** (`/ask`) — a chat-style UI that answers natural-language
   questions about the collected news using the official
   [`@copilot-extensions/preview-sdk`](https://www.npmjs.com/package/@copilot-extensions/preview-sdk),
   grounded in the locally-collected dataset with numbered `[n]` source
   citations. See [Ask page setup](#ask-page-github-copilot-integration).
4. **Resources page** (`/resources`) — curated, hand-picked GitHub
   repositories across AI learning, developer tools & agents, LLM apps,
   security, and platform engineering, enriched with live star counts and
   topics fetched from the GitHub API.
5. **Automated daily freshness** — a scheduled GitHub Actions workflow
   re-runs the ingestion pipeline every day and commits any changes straight
   back to `main`, so the site's data is never more than a day stale. See
   [Data pipeline & daily refresh](#data-pipeline--daily-refresh).

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict mode)
- **Tailwind CSS v4** for styling
- **Zod** for runtime schema validation of the generated JSON datasets
- **rss-parser** for RSS/Atom ingestion
- **`@copilot-extensions/preview-sdk`** (the official GitHub Copilot SDK) for
  the Ask page
- **Vitest** for unit tests
- **ESLint** (flat config, `next/core-web-vitals` + `next/typescript`) and
  **Prettier** for linting/formatting
- **tsx** to run the ingestion scripts directly from TypeScript

No database — the site reads pre-generated, git-committed JSON files
(`data/news.json`, `data/resources.json`) at request time. This keeps the
architecture simple, makes every deploy reproducible from git history, and
means the production site has zero runtime dependency on the ingestion
scripts succeeding at request time.

## Getting started

Requires Node.js 20+ (Node 22 recommended, matches CI).

```bash
npm install

# Optional: (re)generate the local data files from live sources. The repo
# already ships with a real, recently-generated dataset, so this is optional
# for local development.
npm run ingest
npm run ingest:resources

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other useful scripts:

```bash
npm run build         # production build
npm run start          # run the production build
npm run lint            # ESLint
npm run typecheck       # tsc --noEmit
npm run format           # Prettier — write
npm run format:check     # Prettier — check only
npm test                 # Vitest (single run)
npm run test:watch       # Vitest (watch mode)
```

## Environment variables

Copy [`.env.example`](./.env.example) to `.env.local` and fill in what you
need. Every variable is documented there too. Summary:

| Variable               | Required?                | Purpose                                                                                                                   |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `COPILOT_API_TOKEN`    | No (recommended for Ask) | Token used to call the real GitHub Copilot chat-completions API from the Ask page's server route.                         |
| `GITHUB_TOKEN`         | No                       | Fallback for `COPILOT_API_TOKEN`; also used by the ingestion scripts to raise GitHub API rate limits (60 → 5,000 req/hr). |
| `COPILOT_API_MODEL`    | No                       | Overrides the Copilot chat model (default `gpt-4o`).                                                                      |
| `COPILOT_API_ENDPOINT` | No                       | Overrides the Copilot chat-completions endpoint (default `https://api.githubcopilot.com/chat/completions`).               |

**No secrets are ever bundled client-side.** All Copilot/GitHub API calls
happen exclusively in server-only code (`lib/copilot/client.ts`, the
`app/api/*/route.ts` Route Handlers, and the `scripts/*.ts` ingestion
scripts) — none of it is imported by client components. `.env*` files are
git-ignored (only `.env.example`, which contains placeholders only, is
committed).

## Data pipeline & daily refresh

```
scripts/ingest.ts               -> data/news.json
scripts/fetch-resource-metadata.ts -> data/resources.json
```

`npm run ingest`:

1. Fetches every allowlisted source in parallel: 9 AI/tech RSS/Atom feeds +
   2 GitHub blog/changelog feeds (`lib/sources.ts` → `FEED_SOURCES`), and 3
   GitHub repos' Releases via the GitHub REST API (`GITHUB_RELEASE_SOURCES`).
   **Only hosts in this allowlist are ever fetched** — `assertAllowedHost()`
   throws on anything else, so there is no arbitrary/user-supplied URL
   fetching (mitigates SSRF).
2. Normalizes each raw feed/release entry into a common `NewsItem` shape
   (`lib/normalize.ts`): strips HTML, decodes entities, truncates summaries,
   canonicalizes URLs (drops UTM params/fragments/trailing slash) and derives
   a stable id from the canonical URL.
3. De-duplicates by canonical URL, then by a normalized title fingerprint
   within the same category (so the same story picked up by two feeds only
   appears once).
4. Classifies GitHub items into sub-topics (Copilot / Enterprise / Advanced
   Security / Platform / Developer updates) by keyword.
5. Retains only the last 45 days of items (keeps the committed JSON small);
   the home/GitHub pages further scope this down to the _current ISO week_
   at request time (`lib/dateRange.ts`, `lib/newsQuery.ts`).
6. Falls back to bundled demo data (`data/demo-seed.json`) only if live
   fetching fails entirely (flags the whole dataset `isDemoDataset: true`) or
   returns fewer than 5 items (tops up with individually-flagged
   `isDemo: true` items) — so the site is never empty, but real data is
   always preferred and clearly distinguished from demo data in both the
   generated JSON and (for a fully-demo dataset) a banner in the UI.

`npm run ingest:resources` re-fetches live star counts/topics for the curated
repo list (`data/resources.seed.json`) from the GitHub API — metadata is only
included when reliably fetched; a failed lookup just omits the numbers
instead of fabricating them.

### Scheduled refresh (daily)

[`.github/workflows/refresh-news.yml`](./.github/workflows/refresh-news.yml)
runs **once a day** (`cron: "0 6 * * *"`, plus `workflow_dispatch` for
on-demand runs), re-executes both ingestion scripts, and commits
`data/news.json` / `data/resources.json` back to `main` if anything changed
(using the repo's built-in `GITHUB_TOKEN` for both API rate-limit headroom
and the commit/push itself — no extra secrets needed). Combined with your
hosting provider's redeploy-on-push behavior (e.g. Vercel), this keeps the
live site's news within a day of real-world events without needing a
database or server-side cron.

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs lint,
typecheck, format check, unit tests, and a production build on every push and
pull request to `main`.

## Architecture

```mermaid
flowchart LR
  subgraph Ingestion["Ingestion (daily via GitHub Actions)"]
    RSS[RSS/Atom feeds]
    GHR[GitHub Releases API]
    RSS --> N[scripts/ingest.ts]
    GHR --> N
    N --> NJ[data/news.json]
    GHA[GitHub API - repo metadata] --> R[scripts/fetch-resource-metadata.ts]
    R --> RJ[data/resources.json]
  end

  subgraph App["Next.js app (server)"]
    NJ --> Store[lib/newsStore.ts]
    RJ --> RStore[lib/resourceStore.ts]
    Store --> Query[lib/newsQuery.ts]
    Query --> Home[/ Home page /]
    Query --> GH[/ /github page /]
    Query --> API[/api/news]
    Store --> Ask[/api/ask]
    Ask --> Grounding[lib/copilot/grounding.ts]
    Grounding --> Client[lib/copilot/client.ts]
    Client -->|token configured| Copilot[GitHub Copilot chat API]
    Client -->|no token| Fallback[Deterministic extractive answer]
    RStore --> Resources[/ /resources page /]
  end
```

Key modules:

- `lib/types.ts` — Zod schemas + TypeScript types for `NewsItem`,
  `NewsDataset`, `ResourceEntry`, etc.
- `lib/dateRange.ts` — ISO-week (Monday–Monday, UTC) date-range math.
- `lib/normalize.ts` — HTML stripping/entity decoding, URL canonicalization,
  id derivation, de-duplication.
- `lib/newsQuery.ts` — pure query/filter/widen logic shared by the pages and
  the `/api/news` route (highest-value target for unit tests).
- `lib/newsStore.ts` / `lib/resourceStore.ts` — `server-only` file-backed
  readers with schema validation and a short in-memory cache.
- `lib/copilot/` — the Ask page's grounding (term-overlap ranking) and the
  Copilot SDK adapter with its honest fallback.
- `app/*/page.tsx` — server components that load data and render the shared
  `NewsExplorer`/`AskChat`/resource-grid client components.
- `app/api/*/route.ts` — Route Handlers backing the client-side fetches.

## Ask page: GitHub Copilot integration

The Ask page uses the **official** GitHub Copilot SDK,
[`@copilot-extensions/preview-sdk`](https://www.npmjs.com/package/@copilot-extensions/preview-sdk)
(published by GitHub for building Copilot Extensions/agents), calling its
`prompt()` helper against the real Copilot chat-completions API
(`https://api.githubcopilot.com/chat/completions`) — not a generic/unrelated
chat API.

**Runtime requirement:** this SDK is designed for the Copilot Extensions
platform, where a per-request Copilot token is supplied automatically. Used
standalone (as here, from a plain web app's server route), there is no
ambient token — you must supply your own via `COPILOT_API_TOKEN` (or
`GITHUB_TOKEN` as a fallback), and that token must actually be authorized to
call the Copilot API (e.g. a token issued to a Copilot-enabled GitHub
App/OAuth integration). A generic PAT with no Copilot entitlement will not
work for this endpoint.

**Honest fallback, not a fake integration:** if no token is configured, or
the live API call fails for any reason, `askCopilot()`
(`lib/copilot/client.ts`) returns a deterministic, extractive answer built
directly from the same locally-ranked grounding articles — it never silently
swaps in a different chat API, and never fabricates a "live" model response.
The Ask page UI clearly labels which mode produced the answer
("Copilot (model)" vs. "Fallback (no Copilot token configured)").

All grounding is local: `lib/copilot/grounding.ts` ranks the collected news
dataset by simple term overlap with the question (title-match boost, mild
recency boost — no external embeddings/vector DB needed for a
few-hundred-article dataset), and the top matches are injected into the
system prompt as numbered `[n]` citations, which are then also rendered as
clickable source links under the answer.

## Testing, linting, formatting

```bash
npm test            # Vitest — 54 tests across dateRange, normalize, newsQuery, grounding
npm run lint         # ESLint (next/core-web-vitals + next/typescript)
npm run typecheck    # tsc --noEmit
npm run format:check # Prettier
npm run build        # next build (also type-checks)
```

Tests focus on the pure business logic that's easiest to get subtly wrong:

- `tests/dateRange.test.ts` — ISO week boundaries (Monday-start, UTC),
  inclusive/exclusive range checks, `week`/`month`/`all` resolution.
- `tests/normalize.test.ts` — HTML entity decoding, tag stripping, summary
  truncation, URL canonicalization, id derivation, and both exact and
  near-duplicate de-duplication.
- `tests/newsQuery.test.ts` — category/topic/search filtering, the "widen to
  recent items if the current week is sparse" fallback (and that it never
  applies to free-text search), and response shaping.
- `tests/grounding.test.ts` — relevance ranking (including a regression test
  for a bug caught during development, where a recency boost could leak
  completely unrelated-but-recent articles into the grounding context) and
  citation-block formatting.

## Deployment

Any Node.js hosting platform that supports Next.js works (Vercel is the
easiest path — zero-config for the App Router). Steps:

1. Set `COPILOT_API_TOKEN` (and optionally `COPILOT_API_MODEL`) as an
   environment variable on your hosting platform if you want live Copilot
   answers; otherwise the Ask page works fine in fallback mode with no
   configuration at all.
2. Deploy. `data/news.json` and `data/resources.json` are committed to the
   repo, so the very first deploy already has real content — no ingestion
   run is required before going live.
3. Add a repository secret if you want the scheduled workflow's `GITHUB_TOKEN`
   to have more API headroom — the default `${{ secrets.GITHUB_TOKEN }}`
   GitHub Actions provides automatically is already sufficient for this
   project's request volume.
4. Most hosts (Vercel included) redeploy automatically on pushes to `main`,
   so once `.github/workflows/refresh-news.yml` commits the daily data
   update, your live site picks it up on the next deploy.

## Known trade-offs

- `npm audit` reports a small number of high-severity advisories that live
  entirely inside Next.js's own bundled `postcss`/`sharp` dependencies (used
  by Next's built-in Image Optimization feature). This app doesn't use
  `next/image` remote optimization, so the advisories aren't reachable in
  practice; fully clearing them would currently require moving to a Next.js
  16 canary release, which is not appropriate for a "production-quality"
  public repo. Revisit once Next 16 is stable.
- The Ask page's relevance ranking is intentionally simple (term overlap, no
  embeddings) — appropriate for a locally-collected dataset of a few hundred
  articles, but would need a real vector index to scale much further.
- Demo/fallback data (`data/demo-seed.json`) uses relative `daysAgo` offsets
  so it never goes stale, but it is still a small, hand-written set of
  entries — it exists purely so the UI is never empty, not as a
  representative sample of "this week's" news.

## License

[MIT](./LICENSE)
