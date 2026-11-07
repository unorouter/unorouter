"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useLoginRedirect } from "@/hooks/auth/use-login-redirect";
import {
  useBlogPostStats,
  useRecordBlogView,
  useToggleBlogReaction,
} from "@/hooks/blog/blog-hook";
import { REACTION_KINDS, type ReactionKind } from "@/lib/api/typebox/blog";
import type { IconName } from "@/lib/config/icon-map";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

const REACTION_ICON: Record<ReactionKind, IconName> = {
  like: "heart",
  helpful: "circle-check",
  insightful: "sparkles",
  funny: "drama",
};

const REACTION_LABEL = {
  like: "BLOG_ENGAGE.REACT_LIKE",
  helpful: "BLOG_ENGAGE.REACT_HELPFUL",
  insightful: "BLOG_ENGAGE.REACT_INSIGHTFUL",
  funny: "BLOG_ENGAGE.REACT_FUNNY",
} as const satisfies Record<ReactionKind, string>;

export function BlogReactions(props: { slug: string; signedIn: boolean }) {
  const t = useTranslations();
  const stats = useBlogPostStats(props.slug);
  const recordView = useRecordBlogView(props.slug);
  const toggle = useToggleBlogReaction(props.slug);
  const loginRedirect = useLoginRedirect();
  const counted = useRef(false);

  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    recordView.mutate();
  }, [recordView]);

  const data = stats.data;
  const mine = new Set(data?.mine ?? []);

  return (
    <div className="border-border flex flex-wrap items-center gap-2 border-t pt-6">
      {REACTION_KINDS.map((kind) => (
        <Button
          key={kind}
          type="button"
          size="sm"
          variant={mine.has(kind) ? "default" : "outline"}
          disabled={toggle.isPending}
          aria-pressed={mine.has(kind)}
          onClick={() =>
            props.signedIn ? toggle.mutate(kind) : loginRedirect()
          }
          className="gap-1.5 font-mono text-xs"
        >
          <Icon name={REACTION_ICON[kind]} className="h-3.5 w-3.5" />
          {t(REACTION_LABEL[kind])}
          <span
            className={cn(
              "tabular-nums",
              !mine.has(kind) && "text-muted-foreground",
            )}
          >
            {data?.reactions[kind] ?? 0}
          </span>
        </Button>
      ))}
      <span className="text-muted-foreground ml-auto inline-flex items-center gap-1.5 font-mono text-xs">
        <Icon name="eye" className="h-3.5 w-3.5" />
        {t("BLOG_ENGAGE.VIEWS", { count: data?.views ?? 0 })}
      </span>
    </div>
  );
}
