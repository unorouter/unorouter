import {
  deletePublishedParams,
  providerDetailParams,
  rankingDetailParams,
  rankingsQuery,
  verifyAndPublishBody,
} from "@/lib/api/typebox/model-tester";
import { deriveUpstream, getUserId } from "@/server/constants";
import { getSelf } from "@/openapi";
import { Elysia } from "elysia";
import {
  deletePublishedTest,
  getProviderDetail,
  getProviders,
  getPublishedTestDetail,
  getRankingDetail,
  getRankingsStats,
  verifyAndPublish,
} from "./rankings.service";

// Best-effort display name for the publisher. Never fatal: a missing name just
// stores null and the row renders as anonymous. Ownership is the user id.
async function resolveUsername(
  headers: Record<string, string>,
): Promise<string | null> {
  try {
    const res = await getSelf({ headers });
    const data = (
      res as unknown as { data?: { data?: Record<string, unknown> } }
    )?.data?.data;
    const name = data?.display_name || data?.username;
    return typeof name === "string" && name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

export const modelTesterRoute = new Elysia({ prefix: "/model-tester" })
  .derive(deriveUpstream)
  // Server-verified publish: the server runs the whole test with the key and
  // stores its OWN verdict, so the public board cannot be forged by the client.
  .post(
    "/verify-and-publish",
    async ({ body, cookie, upstream }) => {
      const submitterUserId = await getUserId(cookie, true);
      const submitterUsername =
        submitterUserId !== null
          ? await resolveUsername(upstream.headers)
          : null;
      return verifyAndPublish(body, submitterUserId, submitterUsername);
    },
    { body: verifyAndPublishBody },
  )
  // Submitter self-retract of a published row (logged-in owner only; the service
  // enforces ownership in the WHERE, so this is safe even if called directly).
  .delete(
    "/published/:id",
    async ({ params, cookie }) => {
      const userId = await getUserId(cookie, true);
      return deletePublishedTest(params.id, userId);
    },
    { params: deletePublishedParams },
  )
  // A published test + its probe evidence (public, for the unified result card).
  .get(
    "/published/:id/detail",
    async ({ params }) => {
      return getPublishedTestDetail(params.id);
    },
    { params: deletePublishedParams },
  )
  .get("/stats", async () => {
    return getRankingsStats();
  })
  // Level 1: providers grouped by host.
  .get(
    "/rankings",
    async ({ query }) => {
      return getProviders(query.page ?? 1, query.pageSize ?? 20);
    },
    { query: rankingsQuery },
  )
  // Level 2: one provider + its models.
  .get(
    "/rankings/:host",
    async ({ params }) => {
      return getProviderDetail(params.host);
    },
    { params: providerDetailParams },
  )
  // Level 3: one model + every individual test.
  .get(
    "/rankings/:host/:model",
    async ({ params }) => {
      return getRankingDetail(params.host, params.model);
    },
    { params: rankingDetailParams },
  );
