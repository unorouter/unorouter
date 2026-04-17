import { getPost, translated } from "@/components/pages/blog/posts";
import { Link } from "@/i18n/navigation";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface BlogPostProps {
  slug: string;
}

export async function BlogPost(props: BlogPostProps) {
  const locale = await serverLocale();
  const post = getPost(props.slug);
  if (!post) notFound();

  const t = await getTranslations();
  const { title, description, author } = translated(t, post);

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <nav className="mb-8">
        <Link
          href="/blog"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← {t("BLOG.BACK_TO_BLOG")}
        </Link>
      </nav>
      <header className="mb-10">
        <time
          dateTime={post.date}
          className="text-muted-foreground text-xs tracking-wider uppercase"
        >
          {new Intl.DateTimeFormat(locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(new Date(post.date))}
        </time>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-4 text-lg">{description}</p>
        <div className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
          <span>{t("BLOG.BY_AUTHOR", { author })}</span>
        </div>
      </header>
      <div className="prose prose-neutral dark:prose-invert max-w-none [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:my-1 [&_p]:my-4 [&_p]:leading-relaxed [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6">
        <post.Component />
      </div>
    </article>
  );
}
