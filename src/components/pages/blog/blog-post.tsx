import { ScrambleText } from "@/components/elements/fx/scramble-text";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { getBlogTheme } from "@/lib/config/blog-categories";
import { cn } from "@/lib/utils";
import { estimateReadingMinutes } from "@/lib/utils/reading-time";
import { serverLocale } from "@/lib/utils/server";
import dayjs from "dayjs";
import type { TOCItemType } from "fumadocs-core/toc";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";
import {
  getAdjacentPosts,
  getPost,
  getRelatedPosts,
  translated,
} from "./posts";
import { PrevNextNav } from "./prev-next-nav";
import { RelatedPosts } from "./related-posts";

interface BlogPostProps {
  slug: string;
}

export async function BlogPost(props: BlogPostProps) {
  const locale = await serverLocale();
  const post = getPost(props.slug);
  if (!post) notFound();

  const t = await getTranslations();
  const tr = translated(t, post);
  const theme = getBlogTheme(post.category);
  const minutes = estimateReadingMinutes(post.wordCount);
  const adjacent = getAdjacentPosts(post.slug);
  const related = getRelatedPosts(post.slug);
  const categoryLabel = t(
    `BLOG.CATEGORY.${post.category.toUpperCase() as Uppercase<typeof post.category>}`,
  );

  const tocItems: TOCItemType[] = post.headings.map((h) => ({
    url: `#${h.id}`,
    title: t(`${post.i18nKey}.${h.i18nLeaf}` as Parameters<typeof t>[0]),
    depth: h.level,
  }));
  const toc = createTOC(tocItems, t("BLOG.ON_THIS_PAGE"));

  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dayjs(post.date).toDate());

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 gap-4 px-6 pt-24 pb-16">
      <TOCLayout toc={toc}>
        <article className="mx-auto w-full max-w-3xl min-w-0">
          <nav>
            <Link
              href="/blog"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
            >
              <LuArrowLeft className="h-4 w-4" />
              {t("BLOG.BACK_TO_BLOG")}
            </Link>
          </nav>

          <section className="relative overflow-hidden">
            {post.heroImage ? (
              <div className="relative mx-auto mt-8 aspect-21/9 w-full overflow-hidden rounded-2xl">
                <Image
                  src={post.heroImage}
                  alt={tr.title}
                  fill
                  sizes="(min-width: 1024px) 1024px, 100vw"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-background/10" />
              </div>
            ) : (
              <div
                className={cn(
                  "pointer-events-none absolute top-1/2 left-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl",
                  theme.bg.replace("/5", "/30"),
                )}
                aria-hidden
              />
            )}

            <div className="relative flex flex-col items-center pt-12 pb-10 text-center">
              <div
                className={cn(
                  "mb-6 inline-flex items-center gap-2 rounded-sm border px-3 py-1.5",
                  theme.tagBorder,
                  theme.tagBg,
                )}
              >
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
                </span>
                <span
                  className={cn(
                    "font-mono text-[10px] tracking-[0.2em] uppercase",
                    theme.text,
                  )}
                >
                  {t("BLOG.PUBLISHED_BADGE")}
                </span>
              </div>

              <div
                className={cn(
                  "mb-4 font-mono text-xs tracking-widest uppercase",
                  theme.text,
                )}
              >
                {categoryLabel}
              </div>

              <h1 className="text-foreground mb-5 text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                <ScrambleText text={tr.title} />
              </h1>
              <p className="text-muted-foreground max-w-2xl text-[15px] leading-relaxed">
                {tr.description}
              </p>

              <div className="text-muted-foreground mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-xs tracking-wider uppercase">
                <time dateTime={post.date}>{formattedDate}</time>
                <span>·</span>
                <span>{t("BLOG.READ_TIME", { minutes })}</span>
                <span>·</span>
                <span>{t("BLOG.BY_AUTHOR", { author: tr.author })}</span>
              </div>

              {post.tags.length > 0 && (
                <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                  {post.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="font-mono text-[10px]"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="prose prose-neutral dark:prose-invert border-border mt-4 min-w-0 max-w-none border-t pt-12 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:scroll-mt-24 [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:my-1 [&_p]:my-4 [&_p]:leading-relaxed [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6">
            <post.Component />
          </div>

          <PrevNextNav prev={adjacent.prev} next={adjacent.next} />

          <RelatedPosts posts={related} locale={locale} />
        </article>
      </TOCLayout>
    </div>
  );
}
