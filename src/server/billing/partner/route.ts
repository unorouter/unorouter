import { paginationQuery } from "@/lib/api/typebox/common";
import {
  partnerGrantBody,
  partnerRedemptionBody,
  partnerVoidParams,
} from "@/lib/api/typebox/partner";
import { unwrap } from "@/lib/utils/base";
import {
  partnerCreateRedemption,
  partnerGrantQuota,
  partnerListRedemptions,
  partnerVoidRedemption,
} from "@/openapi";
import { deriveUpstream } from "@/server/constants";
import { Elysia } from "elysia";

// Enterprise partner endpoints. Authorization is upstream's job: deriveUpstream
// forwards the caller's own credential and new-api refuses anyone without a
// negotiated top-up bonus, so hiding the UI is presentation only.
export const partnerRoute = new Elysia({ prefix: "/partner" })
  .derive(deriveUpstream)

  .get(
    "/redemption",
    async ({ query, upstream }) =>
      unwrap(await partnerListRedemptions(query, upstream)),
    { query: paginationQuery },
  )

  .post(
    "/redemption",
    async ({ body, upstream }) =>
      unwrap(await partnerCreateRedemption(body, upstream)),
    { body: partnerRedemptionBody },
  )

  .delete(
    "/redemption/:id",
    async ({ params, upstream }) =>
      unwrap(await partnerVoidRedemption(params.id, upstream)),
    { params: partnerVoidParams },
  )

  .post(
    "/grant",
    async ({ body, upstream }) =>
      unwrap(await partnerGrantQuota(body, upstream)),
    { body: partnerGrantBody },
  );
