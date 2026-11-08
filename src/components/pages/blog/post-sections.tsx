import { BLOG_REGISTRY, type BlogSlug } from "@/i18n/registry";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import type { TranslationKey } from "@/lib/types";
import { getTranslations } from "next-intl/server";
import { Fragment, type ComponentType, type ReactNode } from "react";

export type Chunks = Record<string, (chunks: ReactNode) => ReactNode>;

export const PAGE_CHUNKS: Chunks = {
  register: (chunks) => <Link href="/register">{chunks}</Link>,
  models: (chunks) => <Link href="/models">{chunks}</Link>,
  chat: (chunks) => <Link href="/chat">{chunks}</Link>,
  image: (chunks) => <Link href="/image">{chunks}</Link>,
  free: (chunks) => (
    <Link href={{ pathname: "/consents", query: { price: "free" } }}>
      {chunks}
    </Link>
  ),
  settings: (chunks) => <Link href="/settings">{chunks}</Link>,
  pricing: (chunks) => <Link href="/pricing">{chunks}</Link>,
  docs: (chunks) => <Link href="/docs/platform">{chunks}</Link>,
  privacy: (chunks) => <Link href="/privacy">{chunks}</Link>,
  rankings: (chunks) => <Link href="/rankings">{chunks}</Link>,
  tester: (chunks) => <Link href="/ai-api-model-tester">{chunks}</Link>,
  janitor: (chunks) => (
    <Link
      href={{
        pathname: "/docs/integrations/[slug]",
        params: { slug: "janitor-ai" },
      }}
    >
      {chunks}
    </Link>
  ),
};

// One tag per post, <post_where_your_requests_go>, so posts can link each other.
export const POST_CHUNKS: Chunks = Object.fromEntries(
  BLOG_REGISTRY.map((entry) => [
    `post_${entry.slug.replaceAll("-", "_")}`,
    (chunks: ReactNode) => (
      <Link href={{ pathname: "/blog/[slug]", params: { slug: entry.slug } }}>
        {chunks}
      </Link>
    ),
  ]),
);

const BODY_CHUNKS: Chunks = {
  c: (chunks) => <code>{chunks}</code>,
  s: (chunks) => <strong>{chunks}</strong>,
  ...PAGE_CHUNKS,
  ...POST_CHUNKS,
};

const CTA_CHUNKS: Chunks = { ...PAGE_CHUNKS, ...POST_CHUNKS };

// For custom post components, so they link the same way standard posts do.
export const LINK_CHUNKS: Chunks = CTA_CHUNKS;

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
