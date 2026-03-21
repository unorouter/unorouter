import {
  createTokenBody,
  tokenListQuery,
  tokenSearchQuery,
  updateTokenBody,
} from "@/lib/typebox/token";
import {
  addToken,
  deleteToken,
  getAllTokens,
  getApiUserSelfGroups,
  getToken,
  getTokenKey,
  getUserModels,
  searchTokens,
  updateToken,
} from "@/openapi";
import { Elysia } from "elysia";
import { deriveUpstream } from "../constants";

export const tokenRoute = new Elysia({ prefix: "/token" })
  .derive(deriveUpstream)

  .get(
    "/",
    async ({ query, upstream }) => {
      const res = await getAllTokens(
        {
          p: query.p ? Number(query.p) : undefined,
          page_size: query.page_size ? Number(query.page_size) : undefined,
        },
        { headers: upstream.headers },
      );
      return res.data!;
    },
    { query: tokenListQuery },
  )

  .get(
    "/search",
    async ({ query, upstream }) => {
      const res = await searchTokens(
        {
          p: query.p ? Number(query.p) : undefined,
          page_size: query.page_size ? Number(query.page_size) : undefined,
          keyword: query.keyword || undefined,
          token: query.token || undefined,
        },
        { headers: upstream.headers },
      );
      return res.data!;
    },
    { query: tokenSearchQuery },
  )

  .get("/:id", async ({ params, upstream }) => {
    const res = await getToken(params.id, { headers: upstream.headers });
    return res.data!;
  })

  .post(
    "/",
    async ({ body, upstream }) => {
      const res = await addToken(body, {
        headers: upstream.headers,
      });
      return res.data!;
    },
    { body: createTokenBody },
  )

  .put(
    "/",
    async ({ body, upstream }) => {
      const res = await updateToken(body, undefined, {
        headers: upstream.headers,
      });
      return res.data!;
    },
    { body: updateTokenBody },
  )

  .put(
    "/status",
    async ({ body, upstream }) => {
      const res = await updateToken(body, { status_only: "true" }, {
        headers: upstream.headers,
      });
      return res.data!;
    },
    { body: updateTokenBody },
  )

  .post("/:id/key", async ({ params, upstream }) => {
    const res = await getTokenKey(params.id, { headers: upstream.headers });
    return res.data!;
  })

  .delete("/:id", async ({ params, upstream }) => {
    const res = await deleteToken(params.id, { headers: upstream.headers });
    return res.data!;
  })

  .get("/user/groups", async ({ upstream }) => {
    const res = await getApiUserSelfGroups({ headers: upstream.headers });
    return res.data!;
  })

  .get("/user/models", async ({ upstream }) => {
    const res = await getUserModels({ headers: upstream.headers });
    return res.data!;
  });
