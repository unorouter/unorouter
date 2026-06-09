import type { Pathname, pathnames } from "@/i18n/routing";
import type { TranslationKey } from "@/lib/config/constants";
import type { MetadataRoute } from "next";
import type { ComponentType } from "react";

// Static doc slugs only. The dynamic "/docs/[slug]" template is excluded so
// DocSlug stays a subset of SeoTimestampSlug (every member has a real
// seo-timestamps entry); the [slug] route casts its runtime slug to DocSlug.
export type DocSlug = keyof typeof pathnames extends infer K
  ? K extends `/${infer R extends `docs/${string}`}`
    ? R extends `${string}[${string}`
      ? never
      : R
    : never
  : never;

type PostLeaf = "TITLE" | "DESCRIPTION" | "AUTHOR";

// Translation-key prefixes with every PostLeaf under them.
type PostI18nKey = {
  [K in TranslationKey]: K extends `${infer P}.${PostLeaf}`
    ? `${P}.TITLE` extends TranslationKey
      ? `${P}.DESCRIPTION` extends TranslationKey
        ? `${P}.AUTHOR` extends TranslationKey
          ? P
          : never
        : never
      : never
    : never;
}[TranslationKey];

export type BlogCategory = "launch" | "engineering" | "product" | "update";

type BlogHeading = {
  id: string;
  i18nLeaf: string;
  level: 2 | 3;
};

export type BlogPost<Slug extends string = string> = {
  slug: Slug;
  date: string;
  tags: string[];
  Component: ComponentType;
  i18nKey: PostI18nKey;
  category: BlogCategory;
  wordCount: number;
  headings: readonly BlogHeading[];
  heroImage?: string;
};

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

type ChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]["changeFrequency"]
>;

export type PriorityEntry = {
  priority: number;
  changeFrequency: ChangeFrequency;
};

export type SectionPriorities = Partial<
  Record<Pathname extends string ? Pathname : never, PriorityEntry>
>;

type DocI18nPrefix = {
  [K in TranslationKey]: K extends `${infer P}.TITLE`
    ? `${P}.SUBTITLE` extends TranslationKey
      ? P
      : never
    : never;
}[TranslationKey];

export type DocEntry = {
  // For the static "/docs" index this is path.slice(1); for guides served by
  // the single "/docs/[slug]" route it is `docs/${guide.slug}`.
  slug: string;
  // Either a static route ("/docs") or a dynamic href ({ pathname:
  // "/docs/[slug]", params }). getPathname/localeUrl resolve both.
  path: Pathname;
  i18nPrefix: DocI18nPrefix;
  // Drive published/modified timestamps via git history.
  contentFiles: readonly string[];
  priority: number;
  changeFrequency: ChangeFrequency;
};

export type BlogEntry = {
  slug: string;
  date: string;
  tags: readonly string[];
  i18nKey: PostI18nKey;
  contentFiles: readonly string[];
  priority: number;
  changeFrequency: ChangeFrequency;
  category: BlogCategory;
  wordCount: number;
  headings: readonly BlogHeading[];
  heroImage?: string;
};
