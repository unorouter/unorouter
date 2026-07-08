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
  .delete(
    "/published/:id",
    async ({ params, cookie }) => {
      const userId = await getUserId(cookie, true);
      return deletePublishedTest(params.id, userId);
    },
    { params: deletePublishedParams },
  )
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
  .get(
    "/rankings",
    async ({ query }) => {
      return getProviders(query.page ?? 1, query.pageSize ?? 20);
    },
    { query: rankingsQuery },
  )
  .get(
    "/rankings/:host",
    async ({ params }) => {
      return getProviderDetail(params.host);
    },
    { params: providerDetailParams },
  )
  .get(
    "/rankings/:host/:model",
    async ({ params }) => {
      return getRankingDetail(params.host, params.model);
    },
    { params: rankingDetailParams },
  );
