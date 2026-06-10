import { SETUP_GUIDES } from "@/components/pages/docs/setup-guides";
import type { Pathname } from "@/i18n/routing";
import {
  BlogEntry,
  DocEntry,
  PriorityEntry,
  SectionPriorities,
} from "@/lib/types/seo";

// All 27 setup guides render from the single "/docs/[slug]" route, so each
// registry entry's path is the guide's dynamic href and its content/timestamp
// source is the shared data file + template (cc-switch adds its bespoke body).
// generate-search-index, llms.txt, sitemap, and generate-seo-timestamps all
// enumerate this list, so a new guide in SETUP_GUIDES flows through with no
// edit here.
const SETUP_GUIDE_SOURCES = [
  "src/components/pages/docs/setup-guides.ts",
  "src/components/pages/docs/setup-guide-template.tsx",
] as const;

const GUIDE_ENTRIES = SETUP_GUIDES.map(
  (guide): DocEntry => ({
    slug: `docs/${guide.slug}`,
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
  }),
);

export const DOCS_REGISTRY: readonly DocEntry[] = [
  {
    slug: "docs",
    path: "/docs",
    i18nPrefix: "DOCS_INDEX",
    contentFiles: ["src/app/[locale]/(docs)/docs/page.tsx"],
    priority: 0.8,
    changeFrequency: "daily",
  },
  ...GUIDE_ENTRIES,
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
] as const satisfies readonly {
  slug: `legal/${string}`;
  contentFiles: readonly string[];
}[];

export const BLOG_REGISTRY = [
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
    wordCount: 560,
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
    date: "2026-06-08",
    tags: ["announcement", "product"],
    i18nKey: "BLOG.POSTS.FREE_MODELS_AGGREGATED",
    contentFiles: [
      "src/components/pages/blog/posts/2026-06-08-free-models-aggregated-content.tsx",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
    category: "product",
    wordCount: 540,
    headings: [
      { id: "what", i18nLeaf: "H_WHAT", level: 2 },
      { id: "caveat", i18nLeaf: "H_CAVEAT", level: 2 },
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
