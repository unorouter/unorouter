import type {
  BlogEntry,
  DocEntry,
  PriorityEntry,
  SectionPriorities,
} from "@/lib/types/registry";

export const DOCS_REGISTRY: readonly DocEntry[] = [
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
];

export const BLOG_REGISTRY: readonly BlogEntry[] = [
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
  },
];

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
