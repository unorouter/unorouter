import { Link } from "@/i18n/navigation";
import { getBlogTheme } from "@/lib/config/blog-categories";
import type { BlogPost } from "@/lib/types/seo";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import { translated } from "./posts";

interface PrevNextNavProps {
  prev: BlogPost | null;
  next: BlogPost | null;
}

export async function PrevNextNav(props: PrevNextNavProps) {
  const t = await getTranslations();
  if (!props.prev && !props.next) return null;

  return (
    <nav className="border-border mt-16 grid grid-cols-1 gap-3 border-t pt-10 sm:grid-cols-2">
      {props.prev ? (
        <PostLink
          post={props.prev}
          label={t("BLOG.PREV_POST")}
          direction="prev"
          title={translated(t, props.prev).title}
        />
      ) : (
        <div />
      )}
      {props.next ? (
        <PostLink
          post={props.next}
          label={t("BLOG.NEXT_POST")}
          direction="next"
          title={translated(t, props.next).title}
        />
      ) : (
        <div />
      )}
    </nav>
  );
}

function PostLink(props: {
  post: BlogPost;
  label: string;
  direction: "prev" | "next";
  title: string;
}) {
  const theme = getBlogTheme(props.post.category);
  return (
    <Link
      href={{
        pathname: "/blog/[slug]",
        params: { slug: props.post.slug },
      }}
      className={cn(
        "group border-border hover:bg-muted/30 flex flex-col gap-2 rounded-lg border p-5 transition-colors",
        props.direction === "next" && "sm:text-right",
      )}
    >
      <div
        className={cn(
          "text-muted-foreground inline-flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase",
          props.direction === "next" && "sm:flex-row-reverse",
        )}
      >
        {props.direction === "prev" ? (
          <Icon name="arrow-left" className="h-3 w-3" />
        ) : (
          <Icon name="arrow-right" className="h-3 w-3" />
        )}
        {props.label}
      </div>
      <div
        className={cn(
          "group-hover:text-foreground line-clamp-2 font-semibold tracking-tight transition-colors",
          theme.text,
        )}
      >
        {props.title}
      </div>
    </Link>
  );
}
