"use client";

import type { BlogCategory } from "@/lib/types/seo";
import {
  blogCategoryAtom,
  blogClearFiltersAtom,
  blogSearchAtom,
} from "@/store/blog-store";
import { useAtom, useSetAtom } from "jotai";

export type BlogListPost = {
  slug: string;
  date: string;
  tags: readonly string[];
  category: BlogCategory;
  wordCount: number;
  heroImage?: string;
  title: string;
  description: string;
};

export function useBlogFilter(posts: BlogListPost[]) {
  const [search, setSearch] = useAtom(blogSearchAtom);
  const [category, setCategory] = useAtom(blogCategoryAtom);
  const clearFilters = useSetAtom(blogClearFiltersAtom);

  const hasActiveFilters = search.trim().length > 0 || category !== "all";

  const query = search.trim().toLowerCase();
  const filtered = posts.filter((post) => {
    const matchesCategory = category === "all" || post.category === category;
    if (!matchesCategory) return false;
    if (query.length === 0) return true;
    return (
      post.title.toLowerCase().includes(query) ||
      post.description.toLowerCase().includes(query) ||
      post.tags.some((t) => t.toLowerCase().includes(query))
    );
  });

  return {
    posts,
    filtered,
    search,
    setSearch,
    category,
    setCategory,
    hasActiveFilters,
    clearFilters,
  };
}
