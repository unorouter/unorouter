import { LaunchContent } from "@/components/pages/blog/posts/2026-04-17-launch-content";
import type { BlogPost } from "@/lib/types/blog";
import type { useTranslations } from "next-intl";

type Translator = ReturnType<typeof useTranslations<never>>;

export const POSTS: BlogPost[] = [
  {
    slug: "launch",
    date: "2026-04-17",
    tags: ["announcement", "product"],
    Component: LaunchContent,
    i18nKey: "BLOG.POSTS.LAUNCH",
  },
];

export function getAllPostsSorted(): BlogPost[] {
  return [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function translated(t: Translator, post: BlogPost) {
  return {
    title: t(`${post.i18nKey}.TITLE`),
    description: t(`${post.i18nKey}.DESCRIPTION`),
    author: t(`${post.i18nKey}.AUTHOR`),
  };
}
