import {
  deletePublishedParams,
  providerDetailParams,
  rankingDetailParams,
  rankingsQuery,
  verifyAndPublishBody,
} from "@/lib/api/typebox/model-tester";
import { deriveUpstream, getUserId } from "@/server/constants";
import { resolveSelf } from "@/server/auth/account/self.service";
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

export const modelTesterRoute = new Elysia({ prefix: "/model-tester" })
  .derive(deriveUpstream)
  .post(
    "/verify-and-publish",
    async ({ body, request }) => {
      const { user } = await resolveSelf(request);
      return verifyAndPublish(
        body,
        user?.id ?? null,
        user?.display_name || user?.username || null,
      );
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
