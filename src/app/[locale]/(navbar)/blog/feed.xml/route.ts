import { getPostsByLocale } from "@/lib/blog/posts";
import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { getSeoTimestamps } from "@/lib/seo/timestamps";
import { serverLocale } from "@/lib/utils/server";
import { Feed } from "feed";
import { getTranslations } from "next-intl/server";

const siteOrigin = new URL(env.appUrl).origin;

export const revalidate = 3600;

export async function GET(
  _req: Request,
  props: { params: Promise<{ locale: string }> },
) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const posts = getPostsByLocale(locale);
  const siteUrl = `${siteOrigin}/${locale}/blog`;

  const feed = new Feed({
    title: t("BLOG.RSS_TITLE", APP_VALUES),
    description: t("BLOG.RSS_DESC", APP_VALUES),
    id: siteUrl,
    link: siteUrl,
    language: locale,
    feedLinks: { rss2: `${siteOrigin}/${locale}/blog/feed.xml` },
    copyright: `© ${new Date().getFullYear()} ${env.appName}`,
  });

  for (const post of posts) {
    const ts = getSeoTimestamps(`blog/${post.slug}`);
    const url = `${siteOrigin}/${locale}/blog/${post.slug}`;
    feed.addItem({
      title: post.title,
      id: url,
      link: url,
      description: post.description,
      author: [{ name: post.author }],
      date: new Date(ts?.modified ?? post.date),
      category: post.tags.map((t) => ({ name: t })),
    });
  }

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60",
    },
  });
}
