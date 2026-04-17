import { BlogPost } from "@/components/pages/blog/blog-post";
import { POSTS, getPost, translated } from "@/components/pages/blog/posts";
import { APP_VALUES, LOCALES } from "@/lib/config/constants";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildArticleSchema,
  buildBreadcrumbListSchema,
} from "@/lib/seo/structured-data";
import { getSeoTimestamps } from "@/lib/seo/timestamps";
import { localeUrl } from "@/i18n/navigation";
import { serverLocale, serverPathname } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    POSTS.map((p) => ({ locale, slug: p.slug })),
  );
}

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const post = getPost(params.slug);
  if (!post) return {};
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });

  const { title, description } = translated(t, post);

  return getPageMetadata({
    locale,
    href: { pathname: "/blog/[slug]", params: { slug: post.slug } },
    title: t("BLOG.POST_META_TITLE", { ...APP_VALUES, title }),
    description,
    keywords: post.tags.join(", "),
    ogImage: ogBadge("banner", locale),
  });
}

export default async function BlogPostPage(props: PageProps) {
  const params = await props.params;
  const post = getPost(params.slug);
  if (!post) notFound();

  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const ts = getSeoTimestamps(`blog/${post.slug}`);
  const url = await serverPathname(locale);
  const { title, description, author } = translated(t, post);

  return (
    <>
      <JsonLd
        id={`blog-${post.slug}-breadcrumb`}
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("BLOG.TITLE"), url: localeUrl(locale, "/blog") },
          { name: title, url },
        ])}
      />
      <JsonLd
        id={`blog-${post.slug}-article`}
        data={buildArticleSchema({
          locale,
          headline: title,
          description,
          url,
          datePublished: ts?.published ?? post.date,
          dateModified: ts?.modified ?? post.date,
          author,
        })}
      />
      <BlogPost slug={params.slug} />
    </>
  );
}
