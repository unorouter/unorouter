import {
  commentParams,
  commentsQuery,
  createCommentBody,
  hideBody,
  reactBody,
  slugParams,
  voteBody,
} from "@/lib/api/typebox/blog";
import { getClientIp } from "@/server/constants";
import { resolveSelf } from "@/server/auth/account/self.service";
import { rateLimit } from "@/server/rate-limit";
import { serverEnv } from "@/server/env";
import { createHash } from "node:crypto";
import { Elysia } from "elysia";
import {
  type BlogWriteError,
  createComment,
  getPostStats,
  getStatsSummary,
  isKnownPost,
  listComments,
  recordView,
  setCommentHidden,
  toggleReaction,
  toViewer,
  voteComment,
} from "./blog.service";

const STATUS = {
  "login-required": 401,
  "not-found": 404,
  forbidden: 403,
  "rate-limited": 429,
} as const satisfies Record<BlogWriteError, number>;

async function viewerOf(request: Request) {
  return toViewer((await resolveSelf(request)).user);
}

// Visitors are counted, never stored: the address is hashed with a server secret.
function visitorKey(request: Request, userId: number | undefined) {
  if (userId) return `u:${userId}`;
  const ip = getClientIp(request.headers) ?? "unknown";
  return `a:${createHash("sha256")
    .update(`${serverEnv.sessionSecret}:${ip}`)
    .digest("hex")
    .slice(0, 32)}`;
}

export const blogDomainRoute = new Elysia({ prefix: "/blog" })
  .get("/stats", async () => getStatsSummary())
  .get(
    "/posts/:slug/stats",
    async ({ params, request, status }) => {
      if (!isKnownPost(params.slug)) return status(404, { error: "not-found" });
      return getPostStats(params.slug, await viewerOf(request));
    },
    { params: slugParams },
  )
  .post(
    "/posts/:slug/view",
    async ({ params, request, status }) => {
      if (!isKnownPost(params.slug)) return status(404, { error: "not-found" });
      const viewer = await viewerOf(request);
      return recordView(params.slug, visitorKey(request, viewer?.id));
    },
    { params: slugParams, beforeHandle: rateLimit(30) },
  )
  .get(
    "/posts/:slug/comments",
    async ({ params, query, request, status }) => {
      if (!isKnownPost(params.slug)) return status(404, { error: "not-found" });
      return listComments(
        params.slug,
        query.sort ?? "best",
        await viewerOf(request),
      );
    },
    { params: slugParams, query: commentsQuery },
  )
  .post(
    "/posts/:slug/comments",
    async ({ params, body, request, status }) => {
      const viewer = await viewerOf(request);
      const result = !viewer
        ? "login-required"
        : !isKnownPost(params.slug)
          ? "not-found"
          : await createComment(params.slug, viewer, body.body, body.parentId);
      if (typeof result === "string")
        return status(STATUS[result], { error: result });
      return result;
    },
    { params: slugParams, body: createCommentBody, beforeHandle: rateLimit(6) },
  )
  .post(
    "/posts/:slug/react",
    async ({ params, body, request, status }) => {
      const viewer = await viewerOf(request);
      if (!viewer) return status(401, { error: "login-required" });
      if (!isKnownPost(params.slug)) return status(404, { error: "not-found" });
      return toggleReaction(params.slug, viewer, body.kind);
    },
    { params: slugParams, body: reactBody, beforeHandle: rateLimit(30) },
  )
  .post(
    "/comments/:id/vote",
    async ({ params, body, request, status }) => {
      const viewer = await viewerOf(request);
      const result = viewer
        ? await voteComment(params.id, viewer, body.value)
        : "login-required";
      if (typeof result === "string")
        return status(STATUS[result], { error: result });
      return result;
    },
    { params: commentParams, body: voteBody, beforeHandle: rateLimit(60) },
  )
  .post(
    "/comments/:id/hide",
    async ({ params, body, request, status }) => {
      const viewer = await viewerOf(request);
      const result = viewer
        ? await setCommentHidden(params.id, viewer, body.hidden)
        : "login-required";
      if (typeof result === "string")
        return status(STATUS[result], { error: result });
      return result;
    },
    { params: commentParams, body: hideBody },
  );
