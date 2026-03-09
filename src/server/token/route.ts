import {
  addToken,
  deleteToken,
  getAllTokens,
  getApiUserSelfGroups,
  getToken,
  getUserModels,
  searchTokens,
  updateToken,
  type Token,
} from "@/openapi";
import { Elysia, t } from "elysia";
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
    {
      query: t.Object({
        p: t.Optional(t.String()),
        page_size: t.Optional(t.String()),
      }),
    },
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
    {
      query: t.Object({
        p: t.Optional(t.String()),
        page_size: t.Optional(t.String()),
        keyword: t.Optional(t.String()),
        token: t.Optional(t.String()),
      }),
    },
  )

  .get("/:id", async ({ params, upstream }) => {
    const res = await getToken(params.id, { headers: upstream.headers });
    return res.data!;
  })

  .post("/", async ({ body, upstream }) => {
    const res = await addToken(body as Token, { headers: upstream.headers });
    return res.data!;
  })

  .put("/", async ({ body, upstream }) => {
    const res = await updateToken(body as Token, undefined, {
      headers: upstream.headers,
    });
    return res.data!;
  })

  .put("/status", async ({ body, upstream }) => {
    const res = await updateToken(
      body as Token,
      { status_only: "true" },
      {
        headers: upstream.headers,
      },
    );
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
