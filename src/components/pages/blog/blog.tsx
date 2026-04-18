import { BlogList } from "@/components/pages/blog/blog-list";
import {
  getAllPostsSorted,
  translated,
} from "@/components/pages/blog/posts";
import { ScrambleText } from "@/components/elements/fx/scramble-text";
import { cn } from "@/lib/utils";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { LuRss } from "react-icons/lu";

export async function Blog() {
  const locale = await serverLocale();
  const t = await getTranslations();
  const posts = getAllPostsSorted();

  const listPosts = posts.map((post) => {
    const tr = translated(t, post);
    return {
      slug: post.slug,
      date: post.date,
      tags: post.tags,
      category: post.category,
      wordCount: post.wordCount,
      heroImage: post.heroImage,
      title: tr.title,
      description: tr.description,
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-6 pb-16">
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/30 opacity-60 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col items-center pt-20 pb-12 text-center">
          <div
            className={cn(
              "mb-6 inline-flex items-center gap-2 rounded-sm border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5",
            )}
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-emerald-700 uppercase dark:text-emerald-300">
              {t("BLOG.LATEST_BADGE")}
            </span>
          </div>

          <h1 className="text-foreground mb-4 text-5xl font-bold tracking-tighter sm:text-6xl md:text-7xl">
            <ScrambleText text={t("BLOG.TITLE")} />
          </h1>
          <p className="text-muted-foreground max-w-2xl text-[15px] leading-relaxed">
            {t("BLOG.SUBTITLE")}
          </p>

          <div className="text-muted-foreground mt-8 flex flex-wrap items-center justify-center gap-4 font-mono text-xs tracking-wider uppercase">
            <span>
              {t("BLOG.POSTS_COUNT", { count: listPosts.length })}
            </span>
            <span>·</span>
            <span>{locale.toUpperCase()}</span>
            <span>·</span>
            <a
              href={`/${locale}/blog/feed.xml`}
              className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              <LuRss className="h-3 w-3" />
              {t("BLOG.RSS_LINK")}
            </a>
          </div>
        </div>
      </section>

      {posts.length === 0 ? (
        <p className="text-muted-foreground py-24 text-center">
          {t("BLOG.EMPTY")}
        </p>
      ) : (
        <BlogList posts={listPosts} locale={locale} />
      )}
    </div>
  );
}
