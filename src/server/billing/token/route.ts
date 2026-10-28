import {
  createTokenBody,
  tokenIdParams,
  tokenSearchQuery,
  updateTokenBody,
} from "@/lib/api/typebox/token";
import { unwrap } from "@/lib/utils/base";
import {
  addToken,
  deleteToken,
  getTokenKey,
  getUserGroups,
  searchTokens,
  updateToken,
} from "@/openapi";
import { Elysia } from "elysia";
import type { UserGroup } from "@/lib/validation/data-policy";
import { deriveUpstream } from "@/server/constants";
import { resolveBestKey } from "./best-key.service";

export const tokenRoute = new Elysia({ prefix: "/token" })
  .derive(deriveUpstream)

  .get(
    "/search",
    async ({ query, upstream }) => {
      const res = await searchTokens(query, { headers: upstream.headers });
      return unwrap(res);
    },
    { query: tokenSearchQuery },
  )

  .post(
    "/",
    async ({ body, upstream }) => {
      const res = await addToken(
        {
          ...body,
          group_mapping: body.group_mapping ?? "",
          auto_groups: body.auto_groups ?? null,
          allow_user_quota_query: body.allow_user_quota_query ?? null,
          default_reasoning_effort: body.default_reasoning_effort ?? null,
          prompt_cache: body.prompt_cache ?? null,
        },
        {
          headers: upstream.headers,
        },
      );
      return unwrap(res);
    },
    { body: createTokenBody },
  )

  .put(
    "/",
    async ({ body, upstream }) => {
      const res = await updateToken(
        {
          ...body,
          group_mapping: body.group_mapping ?? "",
          auto_groups: body.auto_groups ?? null,
          allow_user_quota_query: body.allow_user_quota_query ?? null,
          default_reasoning_effort: body.default_reasoning_effort ?? null,
          prompt_cache: body.prompt_cache ?? null,
        },
        undefined,
        {
          headers: upstream.headers,
        },
      );
      return unwrap(res);
    },
    { body: updateTokenBody },
  )

  .put(
    "/status",
    async ({ body, upstream }) => {
      const res = await updateToken(
        {
          ...body,
          group_mapping: body.group_mapping ?? "",
          auto_groups: body.auto_groups ?? null,
          allow_user_quota_query: body.allow_user_quota_query ?? null,
          default_reasoning_effort: body.default_reasoning_effort ?? null,
          prompt_cache: body.prompt_cache ?? null,
        },
        { status_only: "true" },
        {
          headers: upstream.headers,
        },
      );
      return unwrap(res);
    },
    { body: updateTokenBody },
  )

  .post(
    "/:id/key",
    async ({ params, upstream }) => {
      const res = await getTokenKey(params.id, { headers: upstream.headers });
      return unwrap(res);
    },
    { params: tokenIdParams },
  )

  .get("/best-key", async ({ upstream }) => {
    const key = await resolveBestKey(upstream.headers);
    return { key };
  })

  .get("/groups", async ({ upstream }): Promise<Record<string, UserGroup>> => {
    const res = await getUserGroups({ headers: upstream.headers });
    const body = unwrap(res);
    return body.data ?? {};
  })

  .delete(
    "/:id",
    async ({ params, upstream }) => {
      const res = await deleteToken(params.id, { headers: upstream.headers });
      return unwrap(res);
    },
    { params: tokenIdParams },
  );
