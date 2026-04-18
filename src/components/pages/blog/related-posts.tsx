import { translated } from "@/components/pages/blog/posts";
import { Link } from "@/i18n/navigation";
import { getBlogTheme } from "@/lib/config/blog-categories";
import type { BlogPost } from "@/lib/types/seo";
import { cn } from "@/lib/utils";
import { estimateReadingMinutes } from "@/lib/utils/reading-time";
import dayjs from "dayjs";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

interface RelatedPostsProps {
  posts: BlogPost[];
  locale: string;
}

export async function RelatedPosts(props: RelatedPostsProps) {
  if (props.posts.length === 0) return null;
  const t = await getTranslations();

  return (
    <section className="mt-16">
      <div className="mb-6 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {t("BLOG.RELATED")}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {props.posts.map((post) => {
          const theme = getBlogTheme(post.category);
          const minutes = estimateReadingMinutes(post.wordCount);
          const tr = translated(t, post);
          const categoryLabel = t(
            `BLOG.CATEGORY.${post.category.toUpperCase() as Uppercase<typeof post.category>}`,
          );
          return (
            <Link
              key={post.slug}
              href={{
                pathname: "/blog/[slug]",
                params: { slug: post.slug },
              }}
              className={cn(
                "group flex flex-col overflow-hidden rounded-lg border transition-all hover:-translate-y-0.5",
                theme.border,
                theme.bg,
              )}
            >
              <div
                className={cn(
                  "relative aspect-[16/9] overflow-hidden",
                  theme.bg,
                )}
              >
                {post.heroImage ? (
                  <Image
                    src={post.heroImage}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 340px, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div
                    className={cn(
                      "absolute inset-0 opacity-80",
                      theme.bg.replace("/5", "/20"),
                    )}
                  />
                )}
              </div>
              <div className="flex flex-col gap-3 p-5">
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tracking-widest uppercase">
                  <span className={theme.text}>{categoryLabel}</span>
                  <span>·</span>
                  <time dateTime={post.date}>
                    {new Intl.DateTimeFormat(props.locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }).format(dayjs(post.date).toDate())}
                  </time>
                  <span>·</span>
                  <span>{t("BLOG.READ_TIME", { minutes })}</span>
                </div>
                <div className="group-hover:text-primary line-clamp-2 font-semibold tracking-tight transition-colors">
                  {tr.title}
                </div>
                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {tr.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
