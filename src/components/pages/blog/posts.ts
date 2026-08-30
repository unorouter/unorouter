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

export function getRelatedPosts(slug: string, limit = 3): BlogPost<BlogSlug>[] {
  const current = getPost(slug);
  if (!current) return [];
  const others = POSTS.filter((p) => p.slug !== slug);

  const sameCategory = others.filter((p) => p.category === current.category);
  const byTag = others.filter(
    (p) =>
      p.category !== current.category &&
      p.tags.some((t) => current.tags.includes(t)),
  );

  return [...sameCategory, ...byTag]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export function translated(
  t: ReturnType<typeof useTranslations<never>>,
  post: BlogPost,
) {
  return {
    title: t(`${post.i18nKey}.TITLE`, APP_VALUES),
    description: t(`${post.i18nKey}.DESCRIPTION`, APP_VALUES),
    author: t(`${post.i18nKey}.AUTHOR`, APP_VALUES),
  };
}
