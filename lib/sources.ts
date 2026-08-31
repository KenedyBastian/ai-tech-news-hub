import type { Category, GithubTopic } from "./types";

export interface FeedSource {
  id: string;
  name: string;
  homepage: string;
  feedUrl: string;
  category: Category;
  type: "rss";
}

export interface GithubReleaseSource {
  id: string;
  name: string;
  homepage: string;
  /** owner/repo */
  repo: string;
  category: Category;
  githubTopic: GithubTopic;
  type: "github-releases";
}

/**
 * Allowlisted RSS/Atom feeds. Only hosts listed here are ever fetched by the
 * ingestion script — there is no user-supplied or dynamic URL fetching.
 * Sources are reputable, official/first-party blogs and well-established
 * technology publications; no HTML scraping is performed.
 */
export const FEED_SOURCES: FeedSource[] = [
  {
    id: "openai-news",
    name: "OpenAI News",
    homepage: "https://openai.com/news",
    feedUrl: "https://openai.com/news/rss.xml",
    category: "ai",
    type: "rss",
  },
  {
    id: "google-ai-blog",
    name: "Google AI Blog",
    homepage: "https://blog.google/technology/ai/",
    feedUrl: "https://blog.google/technology/ai/rss/",
    category: "ai",
    type: "rss",
  },
  {
    id: "microsoft-source-ai",
    name: "Microsoft Source — AI",
    homepage: "https://news.microsoft.com/source/topics/ai/",
    feedUrl: "https://news.microsoft.com/source/topics/ai/feed/",
    category: "ai",
    type: "rss",
  },
  {
    id: "huggingface-blog",
    name: "Hugging Face Blog",
    homepage: "https://huggingface.co/blog",
    feedUrl: "https://huggingface.co/blog/feed.xml",
    category: "ai",
    type: "rss",
  },
  {
    id: "technology-review-ai",
    name: "MIT Technology Review — AI",
    homepage: "https://www.technologyreview.com/topic/artificial-intelligence/",
    feedUrl:
      "https://www.technologyreview.com/topic/artificial-intelligence/feed",
    category: "ai",
    type: "rss",
  },
  {
    id: "venturebeat-ai",
    name: "VentureBeat AI",
    homepage: "https://venturebeat.com/category/ai/",
    feedUrl: "https://venturebeat.com/category/ai/feed/",
    category: "ai",
    type: "rss",
  },
  {
    id: "theverge-ai",
    name: "The Verge — AI",
    homepage: "https://www.theverge.com/ai-artificial-intelligence",
    feedUrl:
      "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    category: "ai",
    type: "rss",
  },
  {
    id: "arstechnica-ai",
    name: "Ars Technica — AI",
    homepage: "https://arstechnica.com/ai/",
    feedUrl: "https://arstechnica.com/ai/feed/",
    category: "ai",
    type: "rss",
  },
  {
    id: "techcrunch-ai",
    name: "TechCrunch — Artificial Intelligence",
    homepage: "https://techcrunch.com/category/artificial-intelligence/",
    feedUrl: "https://techcrunch.com/category/artificial-intelligence/feed/",
    category: "ai",
    type: "rss",
  },
  {
    id: "github-blog",
    name: "The GitHub Blog",
    homepage: "https://github.blog/",
    feedUrl: "https://github.blog/feed/",
    category: "github",
    type: "rss",
  },
  {
    id: "github-changelog",
    name: "GitHub Changelog",
    homepage: "https://github.blog/changelog/",
    feedUrl: "https://github.blog/changelog/feed/",
    category: "github",
    type: "rss",
  },
];

/**
 * GitHub repositories whose Releases feed we track via the public GitHub
 * REST API (`api.github.com`) to surface concrete platform/tooling release
 * notes (in addition to the editorial changelog blog above).
 */
export const GITHUB_RELEASE_SOURCES: GithubReleaseSource[] = [
  {
    id: "gh-release-copilot-cli",
    name: "GitHub Copilot CLI Releases",
    homepage: "https://github.com/github/copilot-cli/releases",
    repo: "github/copilot-cli",
    category: "github",
    githubTopic: "copilot",
    type: "github-releases",
  },
  {
    id: "gh-release-cli",
    name: "GitHub CLI Releases",
    homepage: "https://github.com/cli/cli/releases",
    repo: "cli/cli",
    category: "github",
    githubTopic: "platform",
    type: "github-releases",
  },
  {
    id: "gh-release-codeql-cli",
    name: "CodeQL CLI Releases",
    homepage: "https://github.com/github/codeql-cli-binaries/releases",
    repo: "github/codeql-cli-binaries",
    category: "github",
    githubTopic: "advanced-security",
    type: "github-releases",
  },
];

/** Allowlisted hostnames the ingestion pipeline is permitted to fetch from. */
export const ALLOWED_FETCH_HOSTS = new Set<string>([
  ...FEED_SOURCES.map((s) => new URL(s.feedUrl).hostname),
  "api.github.com",
]);

/**
 * Keyword matchers used to bucket GitHub-ecosystem items (from the general
 * GitHub blog/changelog feeds) into the sub-topics shown on the GitHub page.
 * Order matters: first match wins.
 */
export const GITHUB_TOPIC_KEYWORDS: Array<{
  topic: GithubTopic;
  keywords: RegExp;
}> = [
  { topic: "copilot", keywords: /copilot/i },
  {
    topic: "advanced-security",
    keywords:
      /(advanced security|code ?ql|secret scanning|dependabot|security)/i,
  },
  {
    topic: "enterprise",
    keywords: /(enterprise|github enterprise|ghe[cs]?\b|sso|saml|audit log)/i,
  },
  {
    topic: "platform",
    keywords:
      /(actions|packages|api|graphql|rest api|releases?|platform|codespaces|pages)/i,
  },
];

export function classifyGithubTopic(text: string): GithubTopic {
  for (const { topic, keywords } of GITHUB_TOPIC_KEYWORDS) {
    if (keywords.test(text)) return topic;
  }
  return "developer-updates";
}
