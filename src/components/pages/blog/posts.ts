import { standardPost } from "@/components/pages/blog/post-sections";
import { AgentReadyContent } from "@/components/pages/blog/posts/2026-04-25-agent-ready-content";
import { ClaudeAuthenticityContent } from "@/components/pages/blog/posts/2026-04-26-claude-authenticity-content";
import { SixInputImageModelsContent } from "@/components/pages/blog/posts/2026-05-18-six-input-image-models-content";
import { DiscordCommunityContent } from "@/components/pages/blog/posts/2026-06-04-discord-community-content";
import { FreeModelsAggregatedContent } from "@/components/pages/blog/posts/2026-06-08-free-models-aggregated-content";
import { FeaturedOnContent } from "@/components/pages/blog/posts/2026-06-12-featured-on-content";
import { OpenSourceOpenrouterAlternativeContent } from "@/components/pages/blog/posts/2026-07-10-open-source-openrouter-alternative-content";
import { HowToConnectUnorouterToNevikaContent } from "@/components/pages/blog/posts/2026-08-01-how-to-connect-unorouter-to-nevika-content";
import { ServerTagCutsFreeModelWaitContent } from "@/components/pages/blog/posts/2026-08-19-server-tag-cuts-free-model-wait-content";
import { AiModelVerifierContent } from "@/components/pages/blog/posts/2026-09-03-ai-model-verifier-content";
import { ConsentForFreeModelsContent } from "@/components/pages/blog/posts/2026-10-16-consent-for-free-models-content";
import { ConsentPerProviderContent } from "@/components/pages/blog/posts/2026-10-21-consent-per-provider-content";
import { QronosJoinsPartnersContent } from "@/components/pages/blog/posts/2026-10-23-qronos-joins-partners-content";
import { BLOG_REGISTRY, type BlogSlug } from "@/i18n/registry";
import { APP_VALUES } from "@/lib/config/constants";
import type {
  BlogPost,
  FaqI18nKey,
  MethodI18nKey,
  TldrI18nKey,
} from "@/lib/types";
import type { useTranslations } from "next-intl";
import type { ComponentType } from "react";

const CUSTOM_COMPONENTS: Partial<Record<BlogSlug, ComponentType>> = {
  "agent-ready": AgentReadyContent,
  "claude-authenticity": ClaudeAuthenticityContent,
  "six-input-image-models": SixInputImageModelsContent,
  "discord-community": DiscordCommunityContent,
  "free-models-aggregated": FreeModelsAggregatedContent,
  "featured-on": FeaturedOnContent,
  "open-source-openrouter-alternative": OpenSourceOpenrouterAlternativeContent,
  "how-to-connect-unorouter-to-nevika": HowToConnectUnorouterToNevikaContent,
  "server-tag-cuts-free-model-wait": ServerTagCutsFreeModelWaitContent,
  "ai-model-verifier": AiModelVerifierContent,
  "consent-for-free-models": ConsentForFreeModelsContent,
  "consent-per-provider": ConsentPerProviderContent,
  "qronos-joins-partners": QronosJoinsPartnersContent,
};

export const POSTS: BlogPost<BlogSlug>[] = BLOG_REGISTRY.map((entry) => ({
  slug: entry.slug,
  date: entry.date,
  tags: [...entry.tags],
  Component: CUSTOM_COMPONENTS[entry.slug] ?? standardPost(entry.slug),
  i18nKey: entry.i18nKey,
  category: entry.category,
  wordCount: entry.wordCount,
  headings: entry.headings,
  heroImage: "heroImage" in entry ? entry.heroImage : undefined,
}));

export function getAllPostsSorted(): BlogPost<BlogSlug>[] {
  // Build date, not the clock: the clock publishes a scheduled post mid-session.
  const today = process.env.NEXT_PUBLIC_BUILD_DATE ?? "";
  return [...POSTS]
    .filter((p) => p.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const GEO_SLUGS = [
  "unorouter-vs-openrouter",
  "best-openrouter-alternatives-2026",
  "open-source-openrouter-alternative",
  "what-is-an-llm-gateway",
  "free-models-aggregated",
  "best-janitor-ai-proxy",
  "free-deepseek-api-key",
  "free-ai-api",
] as const;
export const GEO_POSTS: ReadonlySet<string> = new Set(GEO_SLUGS);

export function faqI18nKey(post: BlogPost): FaqI18nKey | null {
  if (!GEO_POSTS.has(post.slug)) return null;
  return post.i18nKey as FaqI18nKey;
}

export function tldrI18nKey(post: BlogPost): TldrI18nKey | null {
  if (!GEO_POSTS.has(post.slug)) return null;
  return post.i18nKey as TldrI18nKey;
}

export function methodI18nKey(post: BlogPost): MethodI18nKey | null {
  if (!METHOD_POSTS.has(post.slug)) return null;
  return post.i18nKey as MethodI18nKey;
}

export const METHOD_POSTS = new Set<string>([
  "unorouter-vs-risuai",
  "unorouter-vs-sillytavern",
  "unorouter-vs-marinara",
  "unorouter-vs-lumiverse",
  "unorouter-vs-librechat",
  "unorouter-vs-open-webui",
  "unorouter-vs-agnai",
]);

export function getPost(slug: string): BlogPost<BlogSlug> | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function getAdjacentPosts(slug: string): {
  prev: BlogPost<BlogSlug> | null;
  next: BlogPost<BlogSlug> | null;
} {
  const sorted = getAllPostsSorted();
  const index = sorted.findIndex((p) => p.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    next: index > 0 ? sorted[index - 1]! : null,
    prev: index < sorted.length - 1 ? sorted[index + 1]! : null,
  };
}

// Pages that already rank pass readers on to posts on the same search intent.
const RELATED_OVERRIDES: Partial<Record<BlogSlug, BlogSlug[]>> = {
  "unorouter-vs-openrouter": [
    "best-openrouter-alternatives-2026",
    "open-source-openrouter-alternative",
    "what-is-an-llm-gateway",
  ],
  "free-models-aggregated": [
    "free-ai-api",
    "free-deepseek-api-key",
    "server-tag-cuts-free-model-wait",
  ],
  launch: [
    "claude-authenticity",
    "ai-model-verifier",
    "where-your-requests-go",
  ],
  "featured-on": ["launch", "unorouter-vs-openrouter", "free-ai-api"],
  "discord-community": [
    "free-models-aggregated",
    "server-tag-cuts-free-model-wait",
    "qronos-joins-partners",
  ],
  "claude-authenticity": [
    "ai-model-verifier",
    "claude-opus-4-8-vs-4-6-vs-4-7-roleplay",
    "where-your-requests-go",
  ],
  "best-janitor-ai-proxy": [
    "unorouter-vs-janitorai",
    "free-deepseek-api-key",
    "free-ai-api",
  ],
  "unorouter-vs-litellm": [
    "unorouter-vs-portkey",
    "open-source-openrouter-alternative",
    "what-is-an-llm-gateway",
  ],
  "free-ai-api": [
    "free-deepseek-api-key",
    "free-models-aggregated",
    "best-janitor-ai-proxy",
  ],
  "free-deepseek-api-key": [
    "free-ai-api",
    "free-models-aggregated",
    "best-janitor-ai-proxy",
  ],
};

const GUIDE_RELATED_POSTS: Partial<Record<string, BlogSlug[]>> = {
  "janitor-ai": [
    "best-janitor-ai-proxy",
    "unorouter-vs-janitorai",
    "free-deepseek-api-key",
  ],
  sillytavern: [
    "how-to-connect-any-llm-to-sillytavern",
    "best-ai-gateway-for-sillytavern",
    "unorouter-vs-sillytavern",
  ],
  chub: ["unorouter-vs-chub", "best-janitor-ai-proxy"],
  risuai: ["unorouter-vs-risuai"],
  nevika: ["how-to-connect-unorouter-to-nevika"],
  librechat: ["unorouter-vs-librechat", "free-ai-api"],
  "open-webui": ["unorouter-vs-open-webui", "free-ai-api"],
  anythingllm: ["free-ai-api", "what-is-an-llm-gateway"],
  chatbox: ["free-ai-api", "free-deepseek-api-key"],
  lobechat: ["free-ai-api", "free-deepseek-api-key"],
  "page-assist": ["free-ai-api"],
  "big-agi": ["free-ai-api"],
  "cherry-studio": ["free-ai-api", "free-deepseek-api-key"],
  typingmind: ["free-ai-api"],
  boltai: ["free-ai-api"],
  opencode: [
    "free-deepseek-api-key",
    "one-api-key-for-claude-code-and-roleplay",
  ],
  "kilo-code": ["free-deepseek-api-key"],
  cline: ["free-deepseek-api-key"],
  "roo-code": ["free-deepseek-api-key"],
  "continue-dev": ["free-deepseek-api-key"],
  aider: ["free-deepseek-api-key"],
  zed: ["free-deepseek-api-key"],
  codex: ["one-api-key-for-claude-code-and-roleplay"],
  "gemini-cli": ["free-ai-api"],
  hermes: ["free-ai-api"],
  openclaw: ["free-ai-api"],
};

function published(slugs: BlogSlug[] | undefined): BlogPost<BlogSlug>[] {
  const visible = new Set(getAllPostsSorted().map((p) => p.slug));
  return (slugs ?? [])
    .filter((s) => visible.has(s))
    .map((s) => getPost(s))
    .filter((p): p is BlogPost<BlogSlug> => p !== undefined);
}

export function getGuideRelatedPosts(guideSlug: string): BlogPost<BlogSlug>[] {
  return published(GUIDE_RELATED_POSTS[guideSlug]);
}

export function getRelatedPosts(slug: string, limit = 3): BlogPost<BlogSlug>[] {
  const current = getPost(slug);
  if (!current) return [];
  const pinned = published(RELATED_OVERRIDES[current.slug]);
  const pinnedSlugs = new Set(pinned.map((p) => p.slug));
  const others = POSTS.filter(
    (p) => p.slug !== slug && !pinnedSlugs.has(p.slug),
  );

  const sameCategory = others.filter((p) => p.category === current.category);
  const byTag = others.filter(
    (p) =>
      p.category !== current.category &&
      p.tags.some((t) => current.tags.includes(t)),
  );

  const fill = [...sameCategory, ...byTag].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return [...pinned, ...fill].slice(0, limit);
}

export function translated(
  t: ReturnType<typeof useTranslations<never>>,
  post: BlogPost,
) {
  const description = t(`${post.i18nKey}.DESCRIPTION`, APP_VALUES);
  return {
    title: t(`${post.i18nKey}.TITLE`, APP_VALUES),
    description,
    // The on-page summary can run long; the search snippet gets a short one.
    metaDescription: t.has(`${post.i18nKey}.META_DESCRIPTION`)
      ? t(`${post.i18nKey}.META_DESCRIPTION`, APP_VALUES)
      : description,
    author: t(`${post.i18nKey}.AUTHOR`, APP_VALUES),
  };
}
