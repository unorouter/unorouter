import { transferQuotaBody } from "@/lib/typebox/affiliate";
import {
  getAffCode,
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

  .get("/commissions", async ({ upstream }) => {
    const res = await getReferralCommissions({ headers: upstream.headers });
    return res.data!;
  })

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
