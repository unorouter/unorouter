import { BLOG_REGISTRY, type BlogSlug } from "@/i18n/registry";
import { APP_VALUES } from "@/lib/config/constants";
import type { TranslationKey } from "@/lib/types";
import { getTranslations } from "next-intl/server";
import { Fragment, type ReactNode } from "react";

// Most posts are an intro followed by H_X/P_X pairs, and the ids and leaves are
// already in the blog registry, so the components re-encoded data that exists.
// This renders them from that data; a post supplies only what is genuinely its
// own, which is the closing call to action.
type Chunks = Record<string, (chunks: ReactNode) => ReactNode>;

// <c> and <s> carry 43 of the 48 inline tags in body copy; a post passes any
// link handler its own paragraphs use.
const BODY_CHUNKS: Chunks = {
  c: (chunks) => <code>{chunks}</code>,
  s: (chunks) => <strong>{chunks}</strong>,
};

export async function PostSections(props: {
  slug: BlogSlug;
  chunks?: Chunks;
  cta?: ReactNode;
}) {
  const entry = BLOG_REGISTRY.find((e) => e.slug === props.slug);
  if (!entry) return null;
  const t = await getTranslations();
  const key = (leaf: string) => `${entry.i18nKey}.${leaf}` as TranslationKey;
  const body = (leaf: string) =>
    t.rich(key(leaf), { ...APP_VALUES, ...BODY_CHUNKS, ...props.chunks });

  return (
    <>
      <p>{body("INTRO")}</p>

      {entry.headings.map((h) => (
        <Fragment key={h.id}>
          <h2 id={h.id}>{t(key(h.i18nLeaf))}</h2>
          <p>{body(`P_${h.i18nLeaf.slice(2)}`)}</p>
        </Fragment>
      ))}

      {props.cta}
    </>
  );
}
