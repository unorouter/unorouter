import { transferQuotaBody } from "@/lib/api/typebox/affiliate";
import { paginationQuery } from "@/lib/api/typebox/common";
import { unwrap } from "@/lib/utils/base";
import {
  getInvitedUsers,
  getReferralCommissions,
  transferAffQuota,
} from "@/openapi";
import { Elysia } from "elysia";
import { deriveUpstream } from "@/server/constants";

export const affiliateRoute = new Elysia({ prefix: "/affiliate" })
  .derive(deriveUpstream)

  .get(
    "/invitees",
    async ({ query, upstream }) => {
      const res = await getInvitedUsers(query, {
        headers: upstream.headers,
      });
      return unwrap(res);
    },
    { query: paginationQuery },
  )

  .get(
    "/commissions",
    async ({ query, upstream }) => {
      const res = await getReferralCommissions(query, {
        headers: upstream.headers,
      });
      return unwrap(res);
    },
    { query: paginationQuery },
  )

  .post(
    "/transfer",
    async ({ body, upstream }) => {
      const res = await transferAffQuota(body, {
        headers: upstream.headers,
      });
      return unwrap(res);
    },
    { body: transferQuotaBody },
  );
