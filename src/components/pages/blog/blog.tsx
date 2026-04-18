import { TypographicSmokeLazy } from "@/components/ui/fluid-smoke/typographic-smoke-lazy";
import { ScrambleText } from "@/components/elements/fx/scramble-text";
import { BlogList } from "@/components/pages/blog/blog-list";
import {
  getAllPostsSorted,
  translated,
} from "@/components/pages/blog/posts";
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
        <TypographicSmokeLazy />
        <div className="relative flex flex-col items-center pt-20 pb-12 text-center">
          <div
            className={cn(
              "border-primary/20 bg-primary/10 mb-6 inline-flex items-center gap-2 rounded-sm border px-3 py-1.5",
            )}
          >
            <span className="relative flex size-1.5">
              <span className="bg-primary absolute inline-flex size-full animate-ping rounded-full opacity-75" />
              <span className="bg-primary relative inline-flex size-1.5 rounded-full" />
            </span>
            <span className="text-primary font-mono text-[10px] tracking-[0.2em] uppercase">
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
