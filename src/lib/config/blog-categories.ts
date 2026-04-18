import type { VendorTheme } from "@/lib/config/vendor-themes";
import type { BlogCategory } from "@/lib/types/seo";

export const BLOG_CATEGORIES: readonly BlogCategory[] = [
  "launch",
  "engineering",
  "product",
  "update",
] as const;

export const BLOG_CATEGORY_THEMES: Record<BlogCategory, VendorTheme> = {
  launch: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-300",
    tagBg: "bg-emerald-500/10",
    tagBorder: "border-emerald-500/20",
  },
  engineering: {
    bg: "bg-sky-500/5",
    border: "border-sky-500/20",
    text: "text-sky-700 dark:text-sky-300",
    tagBg: "bg-sky-500/10",
    tagBorder: "border-sky-500/20",
  },
  product: {
    bg: "bg-violet-500/5",
    border: "border-violet-500/20",
    text: "text-violet-700 dark:text-violet-300",
    tagBg: "bg-violet-500/10",
    tagBorder: "border-violet-500/20",
  },
  update: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
    tagBg: "bg-amber-500/10",
    tagBorder: "border-amber-500/20",
  },
};

export function getBlogTheme(category: BlogCategory): VendorTheme {
  return BLOG_CATEGORY_THEMES[category];
}
