import { LaunchContent } from "@/components/pages/blog/posts/2026-04-17-launch-content";
import { AgentReadyContent } from "@/components/pages/blog/posts/2026-04-25-agent-ready-content";
import { ClaudeAuthenticityContent } from "@/components/pages/blog/posts/2026-04-26-claude-authenticity-content";
import { SixInputImageModelsContent } from "@/components/pages/blog/posts/2026-05-18-six-input-image-models-content";
import { DiscordCommunityContent } from "@/components/pages/blog/posts/2026-06-04-discord-community-content";
import { FreeModelsAggregatedContent } from "@/components/pages/blog/posts/2026-06-08-free-models-aggregated-content";
import { BLOG_REGISTRY, type BlogSlug } from "@/i18n/registry";
import { APP_VALUES } from "@/lib/config/constants";
import type { BlogPost } from "@/lib/types/seo";
import type { useTranslations } from "next-intl";
import type { ComponentType } from "react";

const COMPONENTS: Record<BlogSlug, ComponentType> = {
  launch: LaunchContent,
  "agent-ready": AgentReadyContent,
  "claude-authenticity": ClaudeAuthenticityContent,
  "six-input-image-models": SixInputImageModelsContent,
  "discord-community": DiscordCommunityContent,
  "free-models-aggregated": FreeModelsAggregatedContent,
};

export const POSTS: BlogPost<BlogSlug>[] = BLOG_REGISTRY.map((entry) => ({
  slug: entry.slug,
  date: entry.date,
  tags: [...entry.tags],
  Component: COMPONENTS[entry.slug],
  i18nKey: entry.i18nKey,
  category: entry.category,
  wordCount: entry.wordCount,
  headings: entry.headings,
  heroImage: "heroImage" in entry ? entry.heroImage : undefined,
}));

export function getAllPostsSorted(): BlogPost<BlogSlug>[] {
  return [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
}

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
