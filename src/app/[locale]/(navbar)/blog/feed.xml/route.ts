import { getAllPostsSorted, translated } from "@/components/pages/blog/posts";
import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { getSeoTimestamps } from "@/lib/seo/metadata";
import { dayjs } from "@/lib/utils/format/date";
import { serverLocale } from "@/lib/utils/server";
import { Feed } from "feed";
import { getTranslations } from "next-intl/server";

export const revalidate = 3600;

export async function GET(
  _req: Request,
  props: { params: Promise<{ locale: string }> },
) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const posts = getAllPostsSorted();
  const siteUrl = `${env.siteOrigin}/${locale}/blog`;

  const feed = new Feed({
    title: t("BLOG.RSS_TITLE", APP_VALUES),
    description: t("BLOG.RSS_DESC", APP_VALUES),
    id: siteUrl,
    link: siteUrl,
    language: locale,
    feedLinks: { rss2: `${env.siteOrigin}/${locale}/blog/feed.xml` },
    copyright: `© ${dayjs().year()} ${env.appName}`,
  });

  for (const post of posts) {
    const ts = getSeoTimestamps(`blog/${post.slug}`);
    const url = `${env.siteOrigin}/${locale}/blog/${post.slug}`;
    const { title, description, author } = translated(t, post);
    feed.addItem({
      title,
      id: url,
      link: url,
      description,
      author: [{ name: author }],
      date: dayjs(ts?.modified ?? post.date).toDate(),
      category: post.tags.map((tag) => ({ name: tag })),
    });
  }

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60",
    },
  });
}
