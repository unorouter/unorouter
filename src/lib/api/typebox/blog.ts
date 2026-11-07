import { t, type Static } from "elysia";

export const COMMENT_MAX_LENGTH = 4000;

export const commentSortSchema = t.Union([
  t.Literal("best"),
  t.Literal("top"),
  t.Literal("new"),
  t.Literal("old"),
  t.Literal("controversial"),
]);
export type CommentSort = Static<typeof commentSortSchema>;

export const reactionKindSchema = t.Union([
  t.Literal("like"),
  t.Literal("helpful"),
  t.Literal("insightful"),
  t.Literal("funny"),
]);
export type ReactionKind = Static<typeof reactionKindSchema>;

export const REACTION_KINDS: ReactionKind[] = [
  "like",
  "helpful",
  "insightful",
  "funny",
];

export const slugParams = t.Object({
  slug: t.String({ minLength: 1, maxLength: 200 }),
});

export const commentParams = t.Object({
  id: t.String({ minLength: 1, maxLength: 64 }),
});

export const commentsQuery = t.Object({
  sort: t.Optional(commentSortSchema),
});

export const createCommentBody = t.Object({
  body: t.String({ minLength: 1, maxLength: COMMENT_MAX_LENGTH }),
  parentId: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
});

export const voteBody = t.Object({
  value: t.Union([t.Literal(1), t.Literal(0), t.Literal(-1)]),
});

export const reactBody = t.Object({
  kind: reactionKindSchema,
});

export const hideBody = t.Object({
  hidden: t.Boolean(),
});

export type BlogComment = {
  id: string;
  parentId: string | null;
  authorName: string | null;
  body: string | null;
  createdAt: number;
  score: number;
  ups: number;
  downs: number;
  myVote: number;
  mine: boolean;
  hidden: boolean;
  removed: boolean;
};

export type BlogCommentsResponse = {
  comments: BlogComment[];
  isAdmin: boolean;
  signedIn: boolean;
};

export type BlogPostStats = {
  slug: string;
  views: number;
  comments: number;
  reactions: Record<ReactionKind, number>;
  mine: ReactionKind[];
};

export type BlogStatsSummary = Record<
  string,
  { views: number; comments: number; reactions: number }
>;
