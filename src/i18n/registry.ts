import {
  BlogEntry,
  DocEntry,
  PriorityEntry,
  SectionPriorities,
} from "@/lib/types/seo";

export const DOCS_REGISTRY = [
  {
    slug: "docs",
    path: "/docs",
    i18nPrefix: "DOCS_INDEX",
    contentFiles: ["src/app/[locale]/(docs)/docs/page.tsx"],
    priority: 0.8,
    changeFrequency: "daily",
  },
  {
    slug: "docs/claude-code",
    path: "/docs/claude-code",
    i18nPrefix: "DOCS.CLAUDE_CODE",
    contentFiles: [
      "src/app/[locale]/(docs)/docs/(cli)/claude-code/page.tsx",
      "src/components/pages/docs/cli/claude-code/claude-code-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    slug: "docs/codex",
    path: "/docs/codex",
    i18nPrefix: "DOCS.CODEX",
    contentFiles: [
      "src/app/[locale]/(docs)/docs/(cli)/codex/page.tsx",
      "src/components/pages/docs/cli/codex/codex-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    slug: "docs/gemini-cli",
    path: "/docs/gemini-cli",
    i18nPrefix: "DOCS.GEMINI_CLI",
    contentFiles: [
      "src/app/[locale]/(docs)/docs/(cli)/gemini-cli/page.tsx",
      "src/components/pages/docs/cli/gemini-cli/gemini-cli-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    slug: "docs/openclaw",
    path: "/docs/openclaw",
    i18nPrefix: "DOCS.OPENCLAW",
    contentFiles: [
      "src/app/[locale]/(docs)/docs/(cli)/openclaw/page.tsx",
      "src/components/pages/docs/cli/openclaw/openclaw-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    slug: "docs/cc-switch",
    path: "/docs/cc-switch",
    i18nPrefix: "DOCS.CC_SWITCH",
    contentFiles: [
      "src/app/[locale]/(docs)/docs/(cli)/cc-switch/page.tsx",
      "src/components/pages/docs/cli/cc-switch/cc-switch-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    slug: "docs/sillytavern",
    path: "/docs/sillytavern",
    i18nPrefix: "DOCS.SILLYTAVERN",
    contentFiles: [
      "src/app/[locale]/(docs)/docs/(rp)/sillytavern/page.tsx",
      "src/components/pages/docs/rp/sillytavern/sillytavern-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    slug: "docs/janitor-ai",
    path: "/docs/janitor-ai",
    i18nPrefix: "DOCS.JANITOR_AI",
    contentFiles: [
      "src/app/[locale]/(docs)/docs/(rp)/janitor-ai/page.tsx",
      "src/components/pages/docs/rp/janitor-ai/janitor-ai-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    slug: "docs/risuai",
    path: "/docs/risuai",
    i18nPrefix: "DOCS.RISUAI",
    contentFiles: [
      "src/app/[locale]/(docs)/docs/(rp)/risuai/page.tsx",
      "src/components/pages/docs/rp/risuai/risuai-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    slug: "docs/chub",
    path: "/docs/chub",
    i18nPrefix: "DOCS.CHUB",
    contentFiles: [
      "src/app/[locale]/(docs)/docs/(rp)/chub/page.tsx",
      "src/components/pages/docs/rp/chub/chub-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "weekly",
  },
] as const satisfies readonly DocEntry[];

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
] as const satisfies readonly {
  slug: `legal/${string}`;
  contentFiles: readonly string[];
}[];

export const BLOG_REGISTRY = [
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
    wordCount: 1100,
    headings: [
      { id: "probes", i18nLeaf: "H_PROBES", level: 2 },
      { id: "not-spoofing", i18nLeaf: "H_NOT_SPOOFING", level: 2 },
      { id: "results", i18nLeaf: "H_RESULTS", level: 2 },
      { id: "why", i18nLeaf: "H_WHY", level: 2 },
      { id: "next", i18nLeaf: "H_NEXT", level: 2 },
      { id: "test", i18nLeaf: "H_TEST", level: 2 },
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
  "/docs": { priority: 0.8, changeFrequency: "daily" },
  "/blog": { priority: 0.8, changeFrequency: "weekly" },
} as const satisfies SectionPriorities;

export const DEFAULT_PRIORITY: PriorityEntry = {
  priority: 0.5,
  changeFrequency: "weekly",
};
