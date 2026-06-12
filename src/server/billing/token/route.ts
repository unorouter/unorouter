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
    const key = await resolveBestKey(upstream.headers);
    return { key };
  })

  .delete("/:id", async ({ params, upstream }) => {
    const res = await deleteToken(params.id, { headers: upstream.headers });
    return unwrap(res);
  });
