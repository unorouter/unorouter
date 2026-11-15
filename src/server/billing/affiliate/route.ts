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
    async ({ query, upstream }) =>
      unwrap(await getInvitedUsers(query, upstream)),
    { query: paginationQuery },
  )

  .get(
    "/commissions",
    async ({ query, upstream }) =>
      unwrap(await getReferralCommissions(query, upstream)),
    { query: paginationQuery },
  )

  .post(
    "/transfer",
    async ({ body, upstream }) =>
      unwrap(await transferAffQuota(body, upstream)),
    { body: transferQuotaBody },
  );
