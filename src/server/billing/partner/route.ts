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
    async ({ query, upstream }) => {
      const res = await partnerListRedemptions(query, {
        headers: upstream.headers,
      });
      return unwrap(res);
    },
    { query: paginationQuery },
  )

  .post(
    "/redemption",
    async ({ body, upstream }) => {
      const res = await partnerCreateRedemption(body, {
        headers: upstream.headers,
      });
      return unwrap(res);
    },
    { body: partnerRedemptionBody },
  )

  .delete(
    "/redemption/:id",
    async ({ params, upstream }) => {
      const res = await partnerVoidRedemption(params.id, {
        headers: upstream.headers,
      });
      return unwrap(res);
    },
    { params: partnerVoidParams },
  )

  .post(
    "/grant",
    async ({ body, upstream }) => {
      const res = await partnerGrantQuota(body, {
        headers: upstream.headers,
      });
      return unwrap(res);
    },
    { body: partnerGrantBody },
  );
