"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { useLoginRedirect } from "@/hooks/auth/use-login-redirect";
import {
  useBlogComments,
  useCreateBlogComment,
  useHideBlogComment,
  useVoteBlogComment,
} from "@/hooks/blog/blog-hook";
import {
  COMMENT_MAX_LENGTH,
  type BlogComment,
  type CommentSort,
} from "@/lib/api/typebox/blog";
import { cn } from "@/lib/utils";
import { formatRelativeUnix } from "@/lib/utils/format/date";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { BlogReactions } from "./blog-reactions";

const SORTS = [
  { id: "best", labelKey: "BLOG_ENGAGE.SORT_BEST" },
  { id: "top", labelKey: "BLOG_ENGAGE.SORT_TOP" },
  { id: "new", labelKey: "BLOG_ENGAGE.SORT_NEW" },
  { id: "old", labelKey: "BLOG_ENGAGE.SORT_OLD" },
  { id: "controversial", labelKey: "BLOG_ENGAGE.SORT_CONTROVERSIAL" },
] as const satisfies readonly { id: CommentSort; labelKey: string }[];

const MAX_INDENT = 6;

type Thread = {
  byParent: Map<string | null, BlogComment[]>;
  slug: string;
  isAdmin: boolean;
  signedIn: boolean;
};

export function BlogEngagement(props: { slug: string }) {
  const t = useTranslations();
  const [sort, setSort] = useState<CommentSort>("best");
  const query = useBlogComments(props.slug, sort);
  const data = query.data;
  const comments = data?.comments ?? [];

  // The server sorts the flat list, so grouping by parent keeps each level in order.
  const byParent = new Map<string | null, BlogComment[]>();
  const known = new Set(comments.map((c) => c.id));
  for (const comment of comments) {
    const parent =
      comment.parentId && known.has(comment.parentId) ? comment.parentId : null;
    const siblings = byParent.get(parent) ?? [];
    siblings.push(comment);
    byParent.set(parent, siblings);
  }
  const thread: Thread = {
    byParent,
    slug: props.slug,
    isAdmin: data?.isAdmin === true,
    signedIn: data?.signedIn === true,
  };
  const visibleCount = comments.filter((c) => !c.removed).length;

  return (
    <section id="comments" className="mt-12">
      <BlogReactions slug={props.slug} signedIn={thread.signedIn} />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-foreground text-xl font-semibold">
          {t("BLOG_ENGAGE.COMMENTS_TITLE", { count: visibleCount })}
        </h2>
        <div role="tablist" className="flex flex-wrap items-center gap-1">
          {SORTS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={sort === option.id}
              onClick={() => setSort(option.id)}
              className={cn(
                "rounded-sm px-2 py-1 font-mono text-[11px] tracking-wider uppercase transition-colors",
                sort === option.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <Composer slug={props.slug} signedIn={thread.signedIn} />
      </div>

      <div className="mt-8 space-y-5">
        {query.isLoading ? (
          <p className="text-muted-foreground text-sm">
            {t("BLOG_ENGAGE.LOADING")}
          </p>
        ) : (thread.byParent.get(null) ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("BLOG_ENGAGE.EMPTY")}
          </p>
        ) : (
          (thread.byParent.get(null) ?? []).map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              thread={thread}
              depth={0}
            />
          ))
        )}
      </div>
    </section>
  );
}

function Composer(props: {
  slug: string;
  signedIn: boolean;
  parentId?: string;
  onDone?: () => void;
}) {
  const t = useTranslations();
  const [body, setBody] = useState("");
  const create = useCreateBlogComment(props.slug);
  const loginRedirect = useLoginRedirect();

  if (!props.signedIn) {
    return (
      <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed px-4 py-3">
        <span className="text-muted-foreground text-sm">
          {t("BLOG_ENGAGE.LOGIN_TO_COMMENT")}
        </span>
        <Button type="button" size="sm" onClick={() => loginRedirect()}>
          {t("BLOG_ENGAGE.LOGIN")}
        </Button>
      </div>
    );
  }

  const trimmed = body.trim();
  const submit = () => {
    if (!trimmed) return;
    create.mutate(
      {
        body: trimmed,
        ...(props.parentId ? { parentId: props.parentId } : {}),
      },
      {
        onSuccess: () => {
          setBody("");
          props.onDone?.();
        },
      },
    );
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        maxLength={COMMENT_MAX_LENGTH}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t(
          props.parentId
            ? "BLOG_ENGAGE.REPLY_PLACEHOLDER"
            : "BLOG_ENGAGE.PLACEHOLDER",
        )}
        className="min-h-20"
      />
      <div className="flex items-center justify-end gap-2">
        {props.onDone && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => props.onDone?.()}
          >
            {t("BLOG_ENGAGE.CANCEL")}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          disabled={!trimmed || create.isPending}
          onClick={submit}
        >
          {t(props.parentId ? "BLOG_ENGAGE.REPLY" : "BLOG_ENGAGE.POST")}
        </Button>
      </div>
    </div>
  );
}

function CommentNode(props: {
  comment: BlogComment;
  thread: Thread;
  depth: number;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const vote = useVoteBlogComment(props.thread.slug);
  const hide = useHideBlogComment(props.thread.slug);
  const loginRedirect = useLoginRedirect();
  const comment = props.comment;
  const children = props.thread.byParent.get(comment.id) ?? [];

  const castVote = (value: 1 | -1) => {
    if (!props.thread.signedIn) return loginRedirect();
    vote.mutate({
      id: comment.id,
      value: comment.myVote === value ? 0 : value,
    });
  };

  return (
    <div className={cn(props.depth > 0 && "border-border border-l pl-4")}>
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={t(
            collapsed ? "BLOG_ENGAGE.EXPAND" : "BLOG_ENGAGE.COLLAPSE",
          )}
          className="text-muted-foreground hover:text-foreground"
        >
          <Icon
            name={collapsed ? "chevron-right" : "chevron-down"}
            className="h-3.5 w-3.5"
          />
        </button>
        <span className="text-foreground font-medium">
          {comment.removed ? t("BLOG_ENGAGE.REMOVED") : comment.authorName}
        </span>
        <span className="text-muted-foreground">
          {t("BLOG_ENGAGE.POINTS", { count: comment.score })}
        </span>
        <span className="text-muted-foreground">
          {formatRelativeUnix(Math.floor(comment.createdAt / 1000), locale)}
        </span>
        {comment.hidden && (
          <Badge variant="outline" className="text-[10px]">
            {t("BLOG_ENGAGE.HIDDEN_BADGE")}
          </Badge>
        )}
      </div>

      {!collapsed && (
        <>
          <p
            className={cn(
              "mt-1.5 text-sm leading-relaxed break-words whitespace-pre-wrap",
              comment.removed
                ? "text-muted-foreground italic"
                : "text-foreground",
            )}
          >
            {comment.removed ? t("BLOG_ENGAGE.REMOVED") : comment.body}
          </p>

          {!comment.removed && (
            <div className="text-muted-foreground mt-1.5 flex items-center gap-1 text-xs">
              <button
                type="button"
                aria-label={t("BLOG_ENGAGE.UPVOTE")}
                aria-pressed={comment.myVote === 1}
                disabled={vote.isPending}
                onClick={() => castVote(1)}
                className={cn(
                  "hover:text-foreground rounded p-1",
                  comment.myVote === 1 && "text-primary",
                )}
              >
                <Icon name="arrow-up" className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-4 text-center tabular-nums">
                {comment.score}
              </span>
              <button
                type="button"
                aria-label={t("BLOG_ENGAGE.DOWNVOTE")}
                aria-pressed={comment.myVote === -1}
                disabled={vote.isPending}
                onClick={() => castVote(-1)}
                className={cn(
                  "hover:text-foreground rounded p-1",
                  comment.myVote === -1 && "text-destructive",
                )}
              >
                <Icon name="arrow-down" className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  props.thread.signedIn
                    ? setReplying(!replying)
                    : loginRedirect()
                }
                className="hover:text-foreground ml-2 inline-flex items-center gap-1 rounded px-1 py-0.5"
              >
                <Icon name="message-square" className="h-3.5 w-3.5" />
                {t("BLOG_ENGAGE.REPLY")}
              </button>
              {props.thread.isAdmin && (
                <button
                  type="button"
                  disabled={hide.isPending}
                  onClick={() =>
                    hide.mutate({ id: comment.id, hidden: !comment.hidden })
                  }
                  className="hover:text-foreground ml-2 inline-flex items-center gap-1 rounded px-1 py-0.5"
                >
                  <Icon
                    name={comment.hidden ? "eye" : "eye-off"}
                    className="h-3.5 w-3.5"
                  />
                  {t(
                    comment.hidden ? "BLOG_ENGAGE.UNHIDE" : "BLOG_ENGAGE.HIDE",
                  )}
                </button>
              )}
            </div>
          )}

          {replying && (
            <div className="mt-3">
              <Composer
                slug={props.thread.slug}
                signedIn={props.thread.signedIn}
                parentId={comment.id}
                onDone={() => setReplying(false)}
              />
            </div>
          )}

          {children.length > 0 && (
            <div
              className={cn(
                "mt-4 space-y-4",
                props.depth >= MAX_INDENT && "-ml-4",
              )}
            >
              {children.map((child) => (
                <CommentNode
                  key={child.id}
                  comment={child}
                  thread={props.thread}
                  depth={props.depth + 1}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
