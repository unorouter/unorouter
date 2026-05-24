import {
  createTokenBody,
  tokenSearchQuery,
  updateTokenBody,
} from "@/lib/api/typebox/token";
import { unwrap } from "@/lib/utils/base";
import {
  addToken,
  deleteToken,
  getTokenKey,
  searchTokens,
  updateToken,
} from "@/openapi";
import { Elysia } from "elysia";
import { deriveUpstream } from "@/server/constants";

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
      const res = await addToken(body, {
        headers: upstream.headers,
      });
      return unwrap(res);
    },
    { body: createTokenBody },
  )

  .put(
    "/",
    async ({ body, upstream }) => {
      const res = await updateToken(body, undefined, {
        headers: upstream.headers,
      });
      return unwrap(res);
    },
    { body: updateTokenBody },
  )

  .put(
    "/status",
    async ({ body, upstream }) => {
      const res = await updateToken(
        body,
        { status_only: "true" },
        {
          headers: upstream.headers,
        },
      );
      return unwrap(res);
    },
    { body: updateTokenBody },
  )

  .post("/:id/key", async ({ params, upstream }) => {
    const res = await getTokenKey(params.id, { headers: upstream.headers });
    return unwrap(res);
  })

  .get("/best-key", async ({ upstream }) => {
    const res = await searchTokens(
      { p: 1, page_size: 100 },
      { headers: upstream.headers },
    );
    const tokens = res.data?.data?.items;
    if (!tokens?.length) return { key: null };

    // Find best token: enabled, unlimited quota, auto group, all models
    const best =
      tokens.find(
        (tok) =>
          tok &&
          tok.status === 1 &&
          tok.unlimited_quota &&
          tok.group === "auto" &&
          !tok.model_limits_enabled,
      ) ?? tokens.find((tok) => tok && tok.status === 1);

    if (!best) return { key: null };

    const keyRes = await getTokenKey(String(best.id), {
      headers: upstream.headers,
    });
    return keyRes.data?.data ?? { key: null };
  })

  .delete("/:id", async ({ params, upstream }) => {
    const res = await deleteToken(params.id, { headers: upstream.headers });
    return unwrap(res);
  });
