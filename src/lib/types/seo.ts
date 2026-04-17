import type { Pathname, pathnames, StaticRoute } from "@/i18n/routing";
import type { TranslationKey } from "@/lib/config/constants";
import type { MetadataRoute } from "next";
import type { ComponentType } from "react";

/** Docs slugs extracted from the pathnames registry (e.g. "docs/claude-code"). */
export type DocSlug = keyof typeof pathnames extends infer K
  ? K extends `/${infer R extends `docs/${string}`}`
    ? R
    : never
  : never;

export type PostLeaf = "TITLE" | "DESCRIPTION" | "AUTHOR";

/** Any translation-key prefix that has every PostLeaf under it (e.g. "BLOG.POSTS.LAUNCH"). */
export type PostI18nKey = {
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

export type BlogPost<Slug extends string = string> = {
  slug: Slug;
  date: string;
  tags: string[];
  Component: ComponentType;
  i18nKey: PostI18nKey;
};

export type ChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]["changeFrequency"]
>;

export type PriorityEntry = {
  priority: number;
  changeFrequency: ChangeFrequency;
};

/** Constraint for per-route priority maps: keys must be valid pathnames. */
export type SectionPriorities = Partial<
  Record<Pathname extends string ? Pathname : never, PriorityEntry>
>;

/** Any translation-key prefix that has both .TITLE and .SUBTITLE under it. */
export type DocI18nPrefix = {
  [K in TranslationKey]: K extends `${infer P}.TITLE`
    ? `${P}.SUBTITLE` extends TranslationKey
      ? P
      : never
    : never;
}[TranslationKey];

export type DocEntry = {
  /** Timestamp-JSON key, e.g. "docs/claude-code". Must equal path.slice(1). */
  slug: string;
  path: StaticRoute;
  /** Root i18n key for the doc's content tree, e.g. "DOCS.CLAUDE_CODE". */
  i18nPrefix: DocI18nPrefix;
  /** Files whose git history drives published/modified timestamps. */
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
};
