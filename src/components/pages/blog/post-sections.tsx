import { BLOG_REGISTRY, type BlogSlug } from "@/i18n/registry";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import type { TranslationKey } from "@/lib/types";
import { getTranslations } from "next-intl/server";
import { Fragment, type ComponentType, type ReactNode } from "react";

type Chunks = Record<string, (chunks: ReactNode) => ReactNode>;

const BODY_CHUNKS: Chunks = {
  c: (chunks) => <code>{chunks}</code>,
  s: (chunks) => <strong>{chunks}</strong>,
};

const CTA_CHUNKS: Chunks = {
  register: (chunks) => <Link href="/register">{chunks}</Link>,
  models: (chunks) => <Link href="/models">{chunks}</Link>,
  chat: (chunks) => <Link href="/chat">{chunks}</Link>,
};

export async function PostSections(props: { slug: BlogSlug; chunks?: Chunks }) {
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

      <p>
        {t.rich(key("CTA"), {
          ...APP_VALUES,
          ...CTA_CHUNKS,
          ...props.chunks,
        })}
      </p>
    </>
  );
}

export function standardPost(slug: BlogSlug): ComponentType {
  return function PostContent() {
    return <PostSections slug={slug} />;
  };
}
