import {
  DocEntry,
  BlogEntry,
  SectionPriorities,
  PriorityEntry,
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
      "src/app/[locale]/(docs)/docs/claude-code/page.tsx",
      "src/components/pages/docs/claude-code/claude-code-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    slug: "docs/codex",
    path: "/docs/codex",
    i18nPrefix: "DOCS.CODEX",
    contentFiles: [
      "src/app/[locale]/(docs)/docs/codex/page.tsx",
      "src/components/pages/docs/codex/codex-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    slug: "docs/gemini-cli",
    path: "/docs/gemini-cli",
    i18nPrefix: "DOCS.GEMINI_CLI",
    contentFiles: [
      "src/app/[locale]/(docs)/docs/gemini-cli/page.tsx",
      "src/components/pages/docs/gemini-cli/gemini-cli-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    slug: "docs/openclaw",
    path: "/docs/openclaw",
    i18nPrefix: "DOCS.OPENCLAW",
    contentFiles: [
      "src/app/[locale]/(docs)/docs/openclaw/page.tsx",
      "src/components/pages/docs/openclaw/openclaw-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    slug: "docs/cc-switch",
    path: "/docs/cc-switch",
    i18nPrefix: "DOCS.CC_SWITCH",
    contentFiles: [
      "src/app/[locale]/(docs)/docs/cc-switch/page.tsx",
      "src/components/pages/docs/cc-switch/cc-switch-content.tsx",
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
