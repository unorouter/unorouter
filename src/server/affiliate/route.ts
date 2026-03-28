import {
  affiliatePaginationQuery,
  transferQuotaBody,
} from "@/lib/typebox/affiliate";
import {
  getAffCode,
  getInvitedUsers,
  getReferralCommissions,
  transferAffQuota,
} from "@/openapi";
import { Elysia } from "elysia";
import { deriveUpstream } from "../constants";

export const affiliateRoute = new Elysia({ prefix: "/affiliate" })
  .derive(deriveUpstream)

  .get("/code", async ({ upstream }) => {
    const res = await getAffCode({ headers: upstream.headers });
    return res.data!;
  })

  .get(
    "/invitees",
    async ({ query, upstream }) => {
      const res = await getInvitedUsers(query, {
        headers: upstream.headers,
      });
      return res.data!;
    },
    { query: affiliatePaginationQuery },
  )

  .get(
    "/commissions",
    async ({ query, upstream }) => {
      const res = await getReferralCommissions(query, {
        headers: upstream.headers,
      });
      return res.data!;
    },
    { query: affiliatePaginationQuery },
  )

  .post(
    "/transfer",
    async ({ body, upstream }) => {
      const res = await transferAffQuota(body, {
        headers: upstream.headers,
      });
      return res.data!;
    },
    { body: transferQuotaBody },
  );
