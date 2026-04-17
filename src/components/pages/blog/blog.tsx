import { getAllPostsSorted, translated } from "@/components/pages/blog/posts";
import { Link } from "@/i18n/navigation";
import dayjs from "dayjs";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export async function Blog() {
  const locale = await serverLocale();
  const t = await getTranslations();
  const posts = getAllPostsSorted();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">
          {t("BLOG.TITLE")}
        </h1>
        <p className="text-muted-foreground">{t("BLOG.SUBTITLE")}</p>
      </header>

      {posts.length === 0 ? (
        <p className="text-muted-foreground">{t("BLOG.EMPTY")}</p>
      ) : (
        <ul className="space-y-8">
          {posts.map((post) => {
            const tr = translated(t, post);
            return (
            <li key={post.slug} className="border-border border-b pb-8">
              <time
                dateTime={post.date}
                className="text-muted-foreground text-xs tracking-wider uppercase"
              >
                {new Intl.DateTimeFormat(locale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }).format(dayjs(post.date).toDate())}
              </time>
              <h2 className="mt-2 text-2xl font-semibold">
                <Link
                  href={{
                    pathname: "/blog/[slug]",
                    params: { slug: post.slug },
                  }}
                  className="hover:text-primary transition-colors"
                >
                  {tr.title}
                </Link>
              </h2>
              <p className="text-muted-foreground mt-2">{tr.description}</p>
              <Link
                href={{
                  pathname: "/blog/[slug]",
                  params: { slug: post.slug },
                }}
                className="text-primary mt-3 inline-block text-sm font-medium"
              >
                {t("BLOG.READ_MORE")} →
              </Link>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
