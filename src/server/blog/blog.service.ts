import { getDb } from "@/lib/db/server/client";
import {
  blogCommentVotes,
  blogComments,
  blogPostReactions,
  blogPostViews,
} from "@/lib/db/schema/blog";
import { BLOG_REGISTRY } from "@/i18n/registry";
import {
  REACTION_KINDS,
  type BlogComment,
  type BlogCommentsResponse,
  type BlogPostStats,
  type BlogStatsSummary,
  type CommentSort,
  type ReactionKind,
} from "@/lib/api/typebox/blog";
import { and, count, eq, gt, inArray, isNull, sql } from "drizzle-orm";

export type BlogViewer = {
  id: number;
  name: string;
  isAdmin: boolean;
};

export type BlogWriteError =
  "login-required" | "not-found" | "forbidden" | "rate-limited";

const COMMENTS_PER_HOUR = 20;
const ADMIN_ROLE = 10;
const KNOWN_SLUGS = new Set<string>(BLOG_REGISTRY.map((entry) => entry.slug));

export function isKnownPost(slug: string): boolean {
  return KNOWN_SLUGS.has(slug);
}

export function toViewer(
  user: {
    id: number;
    role: number;
    display_name: string;
    username: string;
  } | null,
): BlogViewer | null {
  if (!user || !user.id) return null;
  return {
    id: user.id,
    name: publicName(user.id, user.display_name, user.username),
    isAdmin: user.role >= ADMIN_ROLE,
  };
}

// Usernames are often email addresses; a comment must never publish one.
function publicName(id: number, displayName: string, username: string) {
  for (const candidate of [displayName, username]) {
    const name = candidate?.trim();
    if (name && !name.includes("@")) return name.slice(0, 40);
  }
  return `User ${id}`;
}

// Reddit's "best": lower bound of the Wilson interval at 80% confidence.
function wilson(ups: number, downs: number) {
  const n = ups + downs;
  if (n === 0) return 0;
  const z = 1.281551565545;
  const p = ups / n;
  return (
    (p +
      (z * z) / (2 * n) -
      z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) /
    (1 + (z * z) / n)
  );
}

function controversy(ups: number, downs: number) {
  if (ups <= 0 || downs <= 0) return 0;
  const balance = ups > downs ? downs / ups : ups / downs;
  return (ups + downs) ** balance;
}

function sortComments(list: BlogComment[], sort: CommentSort) {
  const by: Record<CommentSort, (a: BlogComment, b: BlogComment) => number> = {
    best: (a, b) =>
      wilson(b.ups, b.downs) - wilson(a.ups, a.downs) ||
      b.createdAt - a.createdAt,
    top: (a, b) => b.score - a.score || b.createdAt - a.createdAt,
    new: (a, b) => b.createdAt - a.createdAt,
    old: (a, b) => a.createdAt - b.createdAt,
    controversial: (a, b) =>
      controversy(b.ups, b.downs) - controversy(a.ups, a.downs) ||
      b.createdAt - a.createdAt,
  };
  return [...list].sort(by[sort]);
}

export async function listComments(
  slug: string,
  sort: CommentSort,
  viewer: BlogViewer | null,
): Promise<BlogCommentsResponse> {
  const db = getDb();
  const rows = await db
    .select()
    .from(blogComments)
    .where(eq(blogComments.postSlug, slug));
  const ids = rows.map((row) => row.id);
  const tallies = ids.length
    ? await db
        .select({
          commentId: blogCommentVotes.commentId,
          ups: sql<number>`sum(case when ${blogCommentVotes.value} > 0 then 1 else 0 end)`,
          downs: sql<number>`sum(case when ${blogCommentVotes.value} < 0 then 1 else 0 end)`,
        })
        .from(blogCommentVotes)
        .where(inArray(blogCommentVotes.commentId, ids))
        .groupBy(blogCommentVotes.commentId)
    : [];
  const mine =
    viewer && ids.length
      ? await db
          .select({
            commentId: blogCommentVotes.commentId,
            value: blogCommentVotes.value,
          })
          .from(blogCommentVotes)
          .where(
            and(
              inArray(blogCommentVotes.commentId, ids),
              eq(blogCommentVotes.userId, viewer.id),
            ),
          )
      : [];
  const tallyById = new Map(tallies.map((row) => [row.commentId, row]));
  const myVoteById = new Map(mine.map((row) => [row.commentId, row.value]));

  const canSee = (row: (typeof rows)[number]) =>
    !row.hiddenAt || viewer?.isAdmin === true || viewer?.id === row.userId;

  // A hidden comment others cannot see still holds its thread together as a
  // "[removed]" stub when a reply below it is visible.
  const childrenOf = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const siblings = childrenOf.get(row.parentId) ?? [];
    siblings.push(row);
    childrenOf.set(row.parentId, siblings);
  }
  const keep = new Map<string, boolean>();
  const shown = (row: (typeof rows)[number]): boolean => {
    const cached = keep.get(row.id);
    if (cached !== undefined) return cached;
    keep.set(row.id, false);
    const result =
      canSee(row) ||
      (childrenOf.get(row.id) ?? []).some((child) => shown(child));
    keep.set(row.id, result);
    return result;
  };

  const comments: BlogComment[] = rows.filter(shown).map((row) => {
    const tally = tallyById.get(row.id);
    const ups = Number(tally?.ups ?? 0);
    const downs = Number(tally?.downs ?? 0);
    const visible = canSee(row);
    return {
      id: row.id,
      parentId: row.parentId,
      authorName: visible ? row.authorName : null,
      body: visible ? row.body : null,
      createdAt: row.createdAt.getTime(),
      score: ups - downs,
      ups,
      downs,
      myVote: myVoteById.get(row.id) ?? 0,
      mine: viewer?.id === row.userId,
      // The author sees their own hidden comment as normal; only admins see the marker.
      hidden: viewer?.isAdmin === true && row.hiddenAt !== null,
      removed: !visible,
    };
  });

  return {
    comments: sortComments(comments, sort),
    isAdmin: viewer?.isAdmin === true,
    signedIn: viewer !== null,
  };
}

export async function createComment(
  slug: string,
  viewer: BlogViewer,
  body: string,
  parentId: string | undefined,
): Promise<{ id: string } | BlogWriteError> {
  const db = getDb();
  if (parentId) {
    const parent = await db
      .select({ postSlug: blogComments.postSlug })
      .from(blogComments)
      .where(eq(blogComments.id, parentId))
      .limit(1);
    if (parent[0]?.postSlug !== slug) return "not-found";
  }
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db
    .select({ n: count() })
    .from(blogComments)
    .where(
      and(
        eq(blogComments.userId, viewer.id),
        gt(blogComments.createdAt, since),
      ),
    );
  if ((recent[0]?.n ?? 0) >= COMMENTS_PER_HOUR) return "rate-limited";

  const inserted = await db
    .insert(blogComments)
    .values({
      postSlug: slug,
      parentId: parentId ?? null,
      userId: viewer.id,
      authorName: viewer.name,
      body: body.trim(),
    })
    .returning({ id: blogComments.id });
  return { id: inserted[0]!.id };
}

export async function voteComment(
  commentId: string,
  viewer: BlogViewer,
  value: number,
): Promise<{ ok: true } | BlogWriteError> {
  const db = getDb();
  const target = await db
    .select({ id: blogComments.id })
    .from(blogComments)
    .where(and(eq(blogComments.id, commentId), isNull(blogComments.hiddenAt)))
    .limit(1);
  if (!target[0]) return "not-found";
  if (value === 0) {
    await db
      .delete(blogCommentVotes)
      .where(
        and(
          eq(blogCommentVotes.commentId, commentId),
          eq(blogCommentVotes.userId, viewer.id),
        ),
      );
    return { ok: true };
  }
  await db
    .insert(blogCommentVotes)
    .values({ commentId, userId: viewer.id, value })
    .onConflictDoUpdate({
      target: [blogCommentVotes.commentId, blogCommentVotes.userId],
      set: { value, updatedAt: new Date() },
    });
  return { ok: true };
}

export async function setCommentHidden(
  commentId: string,
  viewer: BlogViewer,
  hidden: boolean,
): Promise<{ ok: true } | BlogWriteError> {
  if (!viewer.isAdmin) return "forbidden";
  const updated = await getDb()
    .update(blogComments)
    .set(
      hidden
        ? { hiddenAt: new Date(), hiddenBy: viewer.id, updatedAt: new Date() }
        : { hiddenAt: null, hiddenBy: null, updatedAt: new Date() },
    )
    .where(eq(blogComments.id, commentId))
    .returning({ id: blogComments.id });
  return updated[0] ? { ok: true } : "not-found";
}

export async function toggleReaction(
  slug: string,
  viewer: BlogViewer,
  kind: ReactionKind,
): Promise<{ active: boolean }> {
  const db = getDb();
  const where = and(
    eq(blogPostReactions.postSlug, slug),
    eq(blogPostReactions.userId, viewer.id),
    eq(blogPostReactions.kind, kind),
  );
  const existing = await db
    .select({ kind: blogPostReactions.kind })
    .from(blogPostReactions)
    .where(where)
    .limit(1);
  if (existing[0]) {
    await db.delete(blogPostReactions).where(where);
    return { active: false };
  }
  await db
    .insert(blogPostReactions)
    .values({ postSlug: slug, userId: viewer.id, kind });
  return { active: true };
}

export async function recordView(slug: string, visitor: string) {
  const day = new Date().toISOString().slice(0, 10);
  await getDb()
    .insert(blogPostViews)
    .values({ postSlug: slug, visitor, day })
    .onConflictDoNothing();
  return { ok: true as const };
}

export async function getPostStats(
  slug: string,
  viewer: BlogViewer | null,
): Promise<BlogPostStats> {
  const db = getDb();
  const [views, comments, reactions, mine] = await Promise.all([
    db
      .select({ n: count() })
      .from(blogPostViews)
      .where(eq(blogPostViews.postSlug, slug)),
    db
      .select({ n: count() })
      .from(blogComments)
      .where(
        and(eq(blogComments.postSlug, slug), isNull(blogComments.hiddenAt)),
      ),
    db
      .select({ kind: blogPostReactions.kind, n: count() })
      .from(blogPostReactions)
      .where(eq(blogPostReactions.postSlug, slug))
      .groupBy(blogPostReactions.kind),
    viewer
      ? db
          .select({ kind: blogPostReactions.kind })
          .from(blogPostReactions)
          .where(
            and(
              eq(blogPostReactions.postSlug, slug),
              eq(blogPostReactions.userId, viewer.id),
            ),
          )
      : Promise.resolve([]),
  ]);
  const counts: Record<ReactionKind, number> = {
    like: 0,
    helpful: 0,
    insightful: 0,
    funny: 0,
  };
  for (const row of reactions) {
    const kind = REACTION_KINDS.find((k) => k === row.kind);
    if (kind) counts[kind] = row.n;
  }
  return {
    slug,
    views: views[0]?.n ?? 0,
    comments: comments[0]?.n ?? 0,
    reactions: counts,
    mine: REACTION_KINDS.filter((kind) =>
      mine.some((row) => row.kind === kind),
    ),
  };
}

export async function getStatsSummary(): Promise<BlogStatsSummary> {
  const db = getDb();
  const [views, comments, reactions] = await Promise.all([
    db
      .select({ slug: blogPostViews.postSlug, n: count() })
      .from(blogPostViews)
      .groupBy(blogPostViews.postSlug),
    db
      .select({ slug: blogComments.postSlug, n: count() })
      .from(blogComments)
      .where(isNull(blogComments.hiddenAt))
      .groupBy(blogComments.postSlug),
    db
      .select({ slug: blogPostReactions.postSlug, n: count() })
      .from(blogPostReactions)
      .groupBy(blogPostReactions.postSlug),
  ]);
  const summary: BlogStatsSummary = {};
  const entry = (slug: string) =>
    (summary[slug] ??= { views: 0, comments: 0, reactions: 0 });
  for (const row of views) entry(row.slug).views = row.n;
  for (const row of comments) entry(row.slug).comments = row.n;
  for (const row of reactions) entry(row.slug).reactions = row.n;
  return summary;
}
