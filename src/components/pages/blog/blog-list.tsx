"use client";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBlogFilter } from "@/hooks/ui/use-blog-filter-hook";
import { Link } from "@/i18n/navigation";
import { BLOG_CATEGORIES, getBlogTheme } from "@/lib/config/blog-categories";
import type { BlogListPost } from "@/lib/types";
import { estimateReadingMinutes } from "@/components/pages/blog/reading-time";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import Image from "next/image";

interface BlogListProps {
  posts: BlogListPost[];
  locale: string;
}

export function BlogList(props: BlogListProps) {
  const t = useTranslations();
  const filter = useBlogFilter(props.posts);

  const categoryPills = [
    { key: "all" as const, label: t("BLOG.FILTER.ALL") },
    ...BLOG_CATEGORIES.map((c) => ({
      key: c,
      label: t(`BLOG.CATEGORY.${c.toUpperCase() as Uppercase<typeof c>}`),
    })),
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 md:gap-4">
        <p className="text-muted-foreground font-mono text-sm">
          {t("BLOG.POSTS_COUNT", { count: filter.filtered.length })}
        </p>
        {filter.hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={() => filter.clearFilters()}
            className="h-8 px-2 md:h-9 lg:px-3"
          >
            {t("BLOG.FILTER.RESET")}
            <Icon name="x" className="ml-1 h-4 w-4 md:ml-2" />
          </Button>
        )}
      </div>

      <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          />
          <Input
            placeholder={t("BLOG.SEARCH_PLACEHOLDER")}
            value={filter.search}
            onChange={(e) => filter.setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {categoryPills.map((pill) => (
            <Button
              key={pill.key}
              variant={filter.category === pill.key ? "default" : "outline"}
              size="sm"
              onClick={() => filter.setCategory(pill.key)}
              className="font-mono text-xs"
            >
              {pill.label}
            </Button>
          ))}
        </div>
      </div>

      {filter.filtered.length === 0 ? (
        <div className="text-muted-foreground py-24 text-center">
          {t("BLOG.EMPTY_FILTERED")}
        </div>
      ) : (
        <ul className="border-border divide-border divide-y border-y">
          {filter.filtered.map((post, index) => {
            const theme = getBlogTheme(post.category);
            const minutes = estimateReadingMinutes(post.wordCount);
            const sectionNumber = String(
              filter.filtered.length - index,
            ).padStart(2, "0");
            const categoryLabel = t(
              `BLOG.CATEGORY.${post.category.toUpperCase() as Uppercase<typeof post.category>}`,
            );

            return (
              <li key={post.slug}>
                <Link
                  href={{
                    pathname: "/blog/[slug]",
                    params: { slug: post.slug },
                  }}
                  className="group hover:bg-muted/30 relative block px-1 py-8 transition-colors sm:px-4"
                >
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                    <div
                      className={cn(
                        "font-mono text-xs tracking-widest uppercase sm:w-16 sm:pt-1",
                        theme.text,
                      )}
                    >
                      § {sectionNumber}
                    </div>

                    <div className="flex-1">
                      <div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs tracking-wider uppercase">
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-sm border px-2 py-0.5",
                            theme.tagBorder,
                            theme.tagBg,
                            theme.text,
                          )}
                        >
                          {categoryLabel}
                        </span>
                        <time dateTime={post.date}>
                          {new Intl.DateTimeFormat(props.locale, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            timeZone: "UTC",
                          }).format(dayjs(post.date).toDate())}
                        </time>
                        <span>·</span>
                        <span>{t("BLOG.READ_TIME", { minutes })}</span>
                      </div>

                      <h2 className="group-hover:text-primary mb-3 text-2xl font-semibold tracking-tight transition-colors md:text-3xl">
                        {post.title}
                      </h2>
                      <p className="text-muted-foreground max-w-2xl leading-relaxed">
                        {post.description}
                      </p>

                      {post.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {post.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="font-mono text-[10px]"
                            >
                              {t(`BLOG.TAG.${tag}` as Parameters<typeof t>[0])}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div
                        className={cn(
                          "mt-5 inline-flex items-center gap-1 text-sm font-medium transition-transform group-hover:translate-x-1",
                          theme.text,
                        )}
                      >
                        {t("BLOG.READ_MORE")}
                        <Icon name="arrow-right" className="h-4 w-4" />
                      </div>
                    </div>

                    {post.heroImage && (
                      <div
                        className={cn(
                          "relative hidden size-20 shrink-0 overflow-hidden rounded-lg border sm:block",
                          theme.border,
                        )}
                      >
                        <Image
                          src={post.heroImage}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
