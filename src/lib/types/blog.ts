import type { ComponentType } from "react";
import type { TranslationKey } from "@/lib/config/constants";

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

export type BlogPost = {
  slug: string;
  date: string;
  tags: string[];
  Component: ComponentType;
  i18nKey: PostI18nKey;
};
