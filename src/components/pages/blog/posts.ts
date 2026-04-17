import { LaunchContent } from "@/components/pages/blog/posts/2026-04-17-launch-content";
import { BLOG_REGISTRY } from "@/i18n/registry";
import type { BlogPost } from "@/lib/types/blog";
import type { useTranslations } from "next-intl";
import type { ComponentType } from "react";

const COMPONENTS: Record<string, ComponentType> = {
  launch: LaunchContent,
};

export const POSTS: BlogPost[] = BLOG_REGISTRY.map((entry) => ({
  slug: entry.slug,
  date: entry.date,
  tags: [...entry.tags],
  Component: COMPONENTS[entry.slug]!,
  i18nKey: entry.i18nKey,
}));

export function getAllPostsSorted(): BlogPost[] {
  return [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function translated(
  t: ReturnType<typeof useTranslations<never>>,
  post: BlogPost,
) {
  return {
    title: t(`${post.i18nKey}.TITLE`),
    description: t(`${post.i18nKey}.DESCRIPTION`),
    author: t(`${post.i18nKey}.AUTHOR`),
  };
}
