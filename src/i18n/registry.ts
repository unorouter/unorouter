import { CHAT_DOCS } from "@/components/pages/docs/chat/chat-docs";
import { PLATFORM_DOCS } from "@/components/pages/docs/platform/platform-docs";
import { SETUP_GUIDES } from "@/components/pages/docs/setup-guides";
import type { Pathname } from "@/i18n/routing";
import {
  BlogEntry,
  DocEntry,
  PriorityEntry,
  SectionPriorities,
} from "@/lib/types";

// Shared content/timestamp sources for all /docs/[slug] guides; search index, llms.txt, sitemap, seo-timestamps enumerate it.
const SETUP_GUIDE_SOURCES = [
  "src/components/pages/docs/setup-guides.ts",
  "src/components/pages/docs/setup-guide-template.tsx",
] as const;

const GUIDE_ENTRIES = SETUP_GUIDES.map((guide): DocEntry => ({
  slug: `docs/integrations/${guide.slug}`,
  // guide.href is LinkHref; Pathname is the structurally-equal getPathname arg.
  path: guide.href as Pathname,
  i18nPrefix: guide.i18nPrefix as DocEntry["i18nPrefix"],
  contentFiles: guide.customComponent
    ? [
        ...SETUP_GUIDE_SOURCES,
        `src/components/pages/docs/cli/${guide.customComponent}/${guide.customComponent}-content.tsx`,
      ]
    : SETUP_GUIDE_SOURCES,
  priority: 0.7,
  changeFrequency: "weekly",
}));

// Chat user-guide pages: blog-style content components under docs/chat/<slug>.
const CHAT_DOC_SOURCES = [
  "src/components/pages/docs/chat/chat-docs.ts",
  "src/components/pages/docs/chat/chat-doc-template.tsx",
] as const;

const CHAT_DOC_ENTRIES = CHAT_DOCS.map((doc): DocEntry => ({
  slug: `docs/chat/${doc.slug}`,
  path: doc.href as Pathname,
  i18nPrefix: doc.i18nPrefix as DocEntry["i18nPrefix"],
  contentFiles: [...CHAT_DOC_SOURCES, doc.contentFile],
  priority: 0.7,
  changeFrequency: "weekly",
}));

// Platform guide pages (quickstart/errors/billing/models) under docs/platform/<slug>.
const PLATFORM_DOC_SOURCES = [
  "src/components/pages/docs/platform/platform-docs.ts",
  "src/components/pages/docs/platform/platform-doc-template.tsx",
] as const;

const PLATFORM_DOC_ENTRIES = PLATFORM_DOCS.map((doc): DocEntry => ({
  slug: `docs/platform/${doc.slug}`,
  path: doc.href as Pathname,
  i18nPrefix: doc.i18nPrefix as DocEntry["i18nPrefix"],
  contentFiles: [...PLATFORM_DOC_SOURCES, doc.contentFile],
  priority: 0.7,
  changeFrequency: "weekly",
}));

export const DOCS_REGISTRY: readonly DocEntry[] = [
  {
    slug: "docs/integrations",
    path: "/docs/integrations",
    i18nPrefix: "DOCS_INDEX",
    contentFiles: ["src/app/[locale]/(docs)/docs/integrations/page.tsx"],
    priority: 0.8,
    changeFrequency: "daily",
  },
  {
    slug: "docs/chat",
    path: "/docs/chat",
    i18nPrefix: "DOCS_CHAT.INDEX" as DocEntry["i18nPrefix"],
    contentFiles: ["src/app/[locale]/(docs)/docs/chat/page.tsx"],
    priority: 0.8,
    changeFrequency: "weekly",
  },
  {
    slug: "docs/platform",
    path: "/docs/platform",
    i18nPrefix: "DOCS_PLATFORM.INDEX" as DocEntry["i18nPrefix"],
    contentFiles: ["src/app/[locale]/(docs)/docs/platform/page.tsx"],
    priority: 0.8,
    changeFrequency: "weekly",
  },
  ...GUIDE_ENTRIES,
  ...CHAT_DOC_ENTRIES,
  ...PLATFORM_DOC_ENTRIES,
];

/** Pages that get git-derived timestamps but aren't listed as "content". */
export const LEGAL_REGISTRY = [
  {
    slug: "legal/privacy",
    contentFiles: ["src/app/[locale]/(legal)/privacy/page.tsx"],
  },
  {
    slug: "legal/terms",
    contentFiles: ["src/app/[locale]/(legal)/terms/page.tsx"],
  },
  {
    slug: "legal/refund",
    contentFiles: ["src/app/[locale]/(legal)/refund/page.tsx"],
  },
  {
    slug: "legal/aup",
    contentFiles: ["src/app/[locale]/(legal)/aup/page.tsx"],
  },
] as const satisfies readonly {
  slug: `legal/${string}`;
  contentFiles: readonly string[];
}[];

export const BLOG_REGISTRY = [
  {
    slug: "best-ai-gateway-for-sillytavern",
    date: "2026-06-25",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.BEST_AI_GATEWAY_FOR_SILLYTAVERN",
    contentFiles: [
      "src/components/pages/blog/posts/2026-06-25-best-ai-gateway-for-sillytavern-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 620,
    headings: [
      { id: "what-matters", i18nLeaf: "H_WHAT_MATTERS", level: 2 },
      { id: "options", i18nLeaf: "H_OPTIONS", level: 2 },
      { id: "connect", i18nLeaf: "H_CONNECT", level: 2 },
      { id: "free", i18nLeaf: "H_FREE", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "best-openrouter-alternatives-2026",
    date: "2026-06-27",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.BEST_OPENROUTER_ALTERNATIVES_2026",
    contentFiles: [
      "src/components/pages/blog/posts/2026-06-27-best-openrouter-alternatives-2026-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 400,
    headings: [
      { id: "why-switch", i18nLeaf: "H_WHY_SWITCH", level: 2 },
      { id: "what-to-compare", i18nLeaf: "H_WHAT_TO_COMPARE", level: 2 },
      { id: "alternatives", i18nLeaf: "H_ALTERNATIVES", level: 2 },
      { id: "for-roleplay", i18nLeaf: "H_FOR_ROLEPLAY", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "what-is-an-llm-gateway",
    date: "2026-06-29",
    tags: ["product"],
    i18nKey: "BLOG.POSTS.WHAT_IS_AN_LLM_GATEWAY",
    contentFiles: [
      "src/components/pages/blog/posts/2026-06-29-what-is-an-llm-gateway-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "engineering",
    wordCount: 620,
    headings: [
      { id: "definition", i18nLeaf: "H_DEFINITION", level: 2 },
      { id: "why-it-helps", i18nLeaf: "H_WHY_IT_HELPS", level: 2 },
      { id: "how-it-works", i18nLeaf: "H_HOW_IT_WORKS", level: 2 },
      { id: "who-needs-one", i18nLeaf: "H_WHO_NEEDS_ONE", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "how-to-connect-any-llm-to-sillytavern",
    date: "2026-07-01",
    tags: ["product"],
    i18nKey: "BLOG.POSTS.HOW_TO_CONNECT_ANY_LLM_TO_SILLYTAVERN",
    contentFiles: [
      "src/components/pages/blog/posts/2026-07-01-how-to-connect-any-llm-to-sillytavern-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 640,
    headings: [
      { id: "what-you-need", i18nLeaf: "H_WHAT_YOU_NEED", level: 2 },
      { id: "steps", i18nLeaf: "H_STEPS", level: 2 },
      { id: "switching-models", i18nLeaf: "H_SWITCHING_MODELS", level: 2 },
      { id: "troubleshooting", i18nLeaf: "H_TROUBLESHOOTING", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "one-api-key-for-claude-code-and-roleplay",
    date: "2026-07-03",
    tags: ["product"],
    i18nKey: "BLOG.POSTS.ONE_API_KEY_FOR_CLAUDE_CODE_AND_ROLEPLAY",
    contentFiles: [
      "src/components/pages/blog/posts/2026-07-03-one-api-key-for-claude-code-and-roleplay-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 640,
    headings: [
      { id: "two-worlds", i18nLeaf: "H_TWO_WORLDS", level: 2 },
      { id: "claude-code", i18nLeaf: "H_CLAUDE_CODE", level: 2 },
      { id: "roleplay", i18nLeaf: "H_ROLEPLAY", level: 2 },
      { id: "one-balance", i18nLeaf: "H_ONE_BALANCE", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-nano-gpt",
    date: "2026-06-23",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_NANO_GPT",
    contentFiles: [
      "src/components/pages/blog/posts/2026-06-23-unorouter-vs-nano-gpt-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 315,
    headings: [
      { id: "catalog", i18nLeaf: "H_CATALOG", level: 2 },
      { id: "dev", i18nLeaf: "H_DEV", level: 2 },
      { id: "chat", i18nLeaf: "H_CHAT", level: 2 },
      { id: "pay", i18nLeaf: "H_PAY", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-portkey",
    date: "2026-06-21",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_PORTKEY",
    contentFiles: [
      "src/components/pages/blog/posts/2026-06-21-unorouter-vs-portkey-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 315,
    headings: [
      { id: "audience", i18nLeaf: "H_AUDIENCE", level: 2 },
      { id: "setup", i18nLeaf: "H_SETUP", level: 2 },
      { id: "interface", i18nLeaf: "H_INTERFACE", level: 2 },
      { id: "cost", i18nLeaf: "H_COST", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-megallm",
    date: "2026-06-20",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_MEGALLM",
    contentFiles: [
      "src/components/pages/blog/posts/2026-06-20-unorouter-vs-megallm-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 290,
    headings: [
      { id: "same-lane", i18nLeaf: "H_SAME_LANE", level: 2 },
      { id: "models", i18nLeaf: "H_MODELS", level: 2 },
      { id: "chat", i18nLeaf: "H_CHAT", level: 2 },
      { id: "migrate", i18nLeaf: "H_MIGRATE", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-risuai",
    date: "2026-06-19",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_RISUAI",
    contentFiles: [
      "src/components/pages/blog/posts/2026-06-19-unorouter-vs-risuai-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 325,
    headings: [
      { id: "engine", i18nLeaf: "H_ENGINE", level: 2 },
      { id: "two-in-one", i18nLeaf: "H_TWO_IN_ONE", level: 2 },
      { id: "hosting", i18nLeaf: "H_HOSTING", level: 2 },
      { id: "risu-wins", i18nLeaf: "H_RISU_WINS", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-litellm",
    date: "2026-06-17",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_LITELLM",
    contentFiles: [
      "src/components/pages/blog/posts/2026-06-17-unorouter-vs-litellm-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 270,
    headings: [
      { id: "hosted", i18nLeaf: "H_HOSTED", level: 2 },
      { id: "setup", i18nLeaf: "H_SETUP", level: 2 },
      { id: "interface", i18nLeaf: "H_INTERFACE", level: 2 },
      { id: "cost", i18nLeaf: "H_COST", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "featured-on",
    date: "2026-06-12",
    tags: ["announcement", "product"],
    i18nKey: "BLOG.POSTS.FEATURED_ON",
    contentFiles: [
      "src/components/pages/blog/posts/2026-06-12-featured-on-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 320,
    headings: [
      { id: "directories", i18nLeaf: "H_DIRECTORIES", level: 2 },
      { id: "why", i18nLeaf: "H_WHY", level: 2 },
      { id: "verify", i18nLeaf: "H_VERIFY", level: 2 },
      { id: "try", i18nLeaf: "H_TRY", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-openrouter",
    date: "2026-06-10",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_OPENROUTER",
    contentFiles: [
      "src/components/pages/blog/posts/2026-06-10-unorouter-vs-openrouter-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 260,
    headings: [
      { id: "lanes", i18nLeaf: "H_LANES", level: 2 },
      { id: "models", i18nLeaf: "H_MODELS", level: 2 },
      { id: "rp", i18nLeaf: "H_RP", level: 2 },
      { id: "migrate", i18nLeaf: "H_MIGRATE", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "free-models-aggregated",
    date: "2026-06-15",
    tags: ["announcement", "product"],
    i18nKey: "BLOG.POSTS.FREE_MODELS_AGGREGATED",
    contentFiles: [
      "src/components/pages/blog/posts/2026-06-08-free-models-aggregated-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 680,
    headings: [
      { id: "what", i18nLeaf: "H_WHAT", level: 2 },
      { id: "caveat", i18nLeaf: "H_CAVEAT", level: 2 },
      { id: "limit", i18nLeaf: "H_LIMIT", level: 2 },
      { id: "aggregate", i18nLeaf: "H_AGGREGATE", level: 2 },
      { id: "failover", i18nLeaf: "H_FAILOVER", level: 2 },
      { id: "honest", i18nLeaf: "H_HONEST", level: 2 },
      { id: "try", i18nLeaf: "H_TRY", level: 2 },
    ],
  },
  {
    slug: "launch",
    date: "2026-04-17",
    tags: ["announcement", "product"],
    i18nKey: "BLOG.POSTS.LAUNCH",
    contentFiles: [
      "src/components/pages/blog/posts/2026-04-17-launch-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "launch",
    wordCount: 267,
    headings: [
      { id: "uptime", i18nLeaf: "H_UPTIME", level: 2 },
      { id: "authentic", i18nLeaf: "H_AUTHENTIC", level: 2 },
      { id: "harness", i18nLeaf: "H_HARNESS", level: 2 },
      { id: "next", i18nLeaf: "H_NEXT", level: 2 },
    ],
  },
  {
    slug: "agent-ready",
    date: "2026-04-25",
    tags: ["engineering", "announcement"],
    i18nKey: "BLOG.POSTS.AGENT_READY",
    contentFiles: [
      "src/components/pages/blog/posts/2026-04-25-agent-ready-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "engineering",
    wordCount: 490,
    heroImage: "/images/agent-ready-score.png",
    headings: [
      { id: "score", i18nLeaf: "H_SCORE", level: 2 },
      { id: "what", i18nLeaf: "H_WHAT", level: 2 },
      { id: "categories", i18nLeaf: "H_CATEGORIES", level: 2 },
      { id: "stubs", i18nLeaf: "H_STUBS", level: 2 },
      { id: "try", i18nLeaf: "H_TRY", level: 2 },
    ],
  },
  {
    slug: "claude-authenticity",
    date: "2026-04-26",
    tags: ["engineering", "announcement"],
    i18nKey: "BLOG.POSTS.CLAUDE_AUTHENTICITY",
    contentFiles: [
      "src/components/pages/blog/posts/2026-04-26-claude-authenticity-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "engineering",
    wordCount: 700,
    headings: [
      { id: "probes", i18nLeaf: "H_PROBES", level: 2 },
      { id: "not-spoofing", i18nLeaf: "H_NOT_SPOOFING", level: 2 },
      { id: "results", i18nLeaf: "H_RESULTS", level: 2 },
      { id: "why", i18nLeaf: "H_WHY", level: 2 },
      { id: "test", i18nLeaf: "H_TEST", level: 2 },
    ],
  },
  {
    slug: "six-input-image-models",
    date: "2026-05-18",
    tags: ["engineering", "announcement"],
    i18nKey: "BLOG.POSTS.SIX_INPUT_IMAGE_MODELS",
    contentFiles: [
      "src/components/pages/blog/posts/2026-05-18-six-input-image-models-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "engineering",
    wordCount: 650,
    headings: [
      { id: "fixtures", i18nLeaf: "H_FIXTURES", level: 2 },
      { id: "method", i18nLeaf: "H_METHOD", level: 2 },
      { id: "results", i18nLeaf: "H_RESULTS", level: 2 },
      { id: "gotchas", i18nLeaf: "H_GOTCHAS", level: 2 },
      { id: "metadata", i18nLeaf: "H_METADATA", level: 2 },
      { id: "try", i18nLeaf: "H_TRY", level: 2 },
    ],
  },
  {
    slug: "discord-community",
    date: "2026-06-04",
    tags: ["announcement", "community"],
    i18nKey: "BLOG.POSTS.DISCORD_COMMUNITY",
    contentFiles: [
      "src/components/pages/blog/posts/2026-06-04-discord-community-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "update",
    wordCount: 420,
    heroImage:
      "/api/ops/badge/social?locale=en&theme=dark&size=discord&format=png",
    headings: [
      { id: "what", i18nLeaf: "H_WHAT", level: 2 },
      { id: "earn", i18nLeaf: "H_EARN", level: 2 },
      { id: "boost", i18nLeaf: "H_BOOST", level: 2 },
      { id: "bugs", i18nLeaf: "H_BUGS", level: 2 },
      { id: "join", i18nLeaf: "H_JOIN", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-janitorai",
    date: "2026-07-07",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_JANITORAI",
    contentFiles: [
      "src/components/pages/blog/posts/2026-07-07-unorouter-vs-janitorai-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 280,
    headings: [
      { id: "backend", i18nLeaf: "H_BACKEND", level: 2 },
      { id: "proxy", i18nLeaf: "H_PROXY", level: 2 },
      { id: "own-chat", i18nLeaf: "H_OWN_CHAT", level: 2 },
      { id: "migrate", i18nLeaf: "H_MIGRATE", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-character-ai",
    date: "2026-07-09",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_CHARACTER_AI",
    contentFiles: [
      "src/components/pages/blog/posts/2026-07-09-unorouter-vs-character-ai-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 280,
    headings: [
      { id: "walled", i18nLeaf: "H_WALLED", level: 2 },
      { id: "models", i18nLeaf: "H_MODELS", level: 2 },
      { id: "api", i18nLeaf: "H_API", level: 2 },
      { id: "privacy", i18nLeaf: "H_PRIVACY", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-sillytavern",
    date: "2026-07-11",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_SILLYTAVERN",
    contentFiles: [
      "src/components/pages/blog/posts/2026-07-11-unorouter-vs-sillytavern-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 280,
    headings: [
      { id: "hosted", i18nLeaf: "H_HOSTED", level: 2 },
      { id: "depth", i18nLeaf: "H_DEPTH", level: 2 },
      { id: "one-key", i18nLeaf: "H_ONE_KEY", level: 2 },
      { id: "drops-in", i18nLeaf: "H_DROPS_IN", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-chub",
    date: "2026-07-14",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_CHUB",
    contentFiles: [
      "src/components/pages/blog/posts/2026-07-14-unorouter-vs-chub-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 280,
    headings: [
      { id: "cards", i18nLeaf: "H_CARDS", level: 2 },
      { id: "models", i18nLeaf: "H_MODELS", level: 2 },
      { id: "one-key", i18nLeaf: "H_ONE_KEY", level: 2 },
      { id: "cost", i18nLeaf: "H_COST", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-marinara",
    date: "2026-07-16",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_MARINARA",
    contentFiles: [
      "src/components/pages/blog/posts/2026-07-16-unorouter-vs-marinara-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 280,
    headings: [
      { id: "engine", i18nLeaf: "H_ENGINE", level: 2 },
      { id: "two-in-one", i18nLeaf: "H_TWO_IN_ONE", level: 2 },
      { id: "hosting", i18nLeaf: "H_HOSTING", level: 2 },
      { id: "wins", i18nLeaf: "H_WINS", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-lumiverse",
    date: "2026-07-18",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_LUMIVERSE",
    contentFiles: [
      "src/components/pages/blog/posts/2026-07-18-unorouter-vs-lumiverse-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 280,
    headings: [
      { id: "engine", i18nLeaf: "H_ENGINE", level: 2 },
      { id: "two-in-one", i18nLeaf: "H_TWO_IN_ONE", level: 2 },
      { id: "hosting", i18nLeaf: "H_HOSTING", level: 2 },
      { id: "wins", i18nLeaf: "H_WINS", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-librechat",
    date: "2026-07-21",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_LIBRECHAT",
    contentFiles: [
      "src/components/pages/blog/posts/2026-07-21-unorouter-vs-librechat-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 280,
    headings: [
      { id: "hosted", i18nLeaf: "H_HOSTED", level: 2 },
      { id: "models", i18nLeaf: "H_MODELS", level: 2 },
      { id: "one-key", i18nLeaf: "H_ONE_KEY", level: 2 },
      { id: "cost", i18nLeaf: "H_COST", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-open-webui",
    date: "2026-07-23",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_OPEN_WEBUI",
    contentFiles: [
      "src/components/pages/blog/posts/2026-07-23-unorouter-vs-open-webui-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 280,
    headings: [
      { id: "hosted", i18nLeaf: "H_HOSTED", level: 2 },
      { id: "models", i18nLeaf: "H_MODELS", level: 2 },
      { id: "one-key", i18nLeaf: "H_ONE_KEY", level: 2 },
      { id: "cost", i18nLeaf: "H_COST", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-agnai",
    date: "2026-07-25",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_AGNAI",
    contentFiles: [
      "src/components/pages/blog/posts/2026-07-25-unorouter-vs-agnai-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 280,
    headings: [
      { id: "hosted", i18nLeaf: "H_HOSTED", level: 2 },
      { id: "depth", i18nLeaf: "H_DEPTH", level: 2 },
      { id: "one-key", i18nLeaf: "H_ONE_KEY", level: 2 },
      { id: "cost", i18nLeaf: "H_COST", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
  {
    slug: "unorouter-vs-spicychat",
    date: "2026-07-28",
    tags: ["comparison", "product"],
    i18nKey: "BLOG.POSTS.UNOROUTER_VS_SPICYCHAT",
    contentFiles: [
      "src/components/pages/blog/posts/2026-07-28-unorouter-vs-spicychat-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 280,
    headings: [
      { id: "ease", i18nLeaf: "H_EASE", level: 2 },
      { id: "depth", i18nLeaf: "H_DEPTH", level: 2 },
      { id: "models", i18nLeaf: "H_MODELS", level: 2 },
      { id: "one-key", i18nLeaf: "H_ONE_KEY", level: 2 },
      { id: "verdict", i18nLeaf: "H_VERDICT", level: 2 },
    ],
  },
] as const satisfies readonly BlogEntry[];

export type BlogSlug = (typeof BLOG_REGISTRY)[number]["slug"];

/** Union of every slug with a git-derived timestamp entry in public/seo-timestamps.json. */
export type SeoTimestampSlug =
  | (typeof DOCS_REGISTRY)[number]["slug"]
  | `blog/${BlogSlug}`
  | (typeof LEGAL_REGISTRY)[number]["slug"];

/** Priority + changeFrequency for top-level static routes. */
export const SECTION_PRIORITIES = {
  "/": { priority: 1.0, changeFrequency: "daily" },
  "/models": { priority: 0.8, changeFrequency: "daily" },
  "/pricing": { priority: 0.8, changeFrequency: "daily" },
  "/blog": { priority: 0.8, changeFrequency: "weekly" },
} as const satisfies SectionPriorities;

export const DEFAULT_PRIORITY: PriorityEntry = {
  priority: 0.5,
  changeFrequency: "weekly",
};
