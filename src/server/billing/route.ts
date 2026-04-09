import { processPlans } from "@/lib/api/subscription";
import {
  creemPayBody,
  stripePayBody,
  subscriptionPayBody,
  subscriptionPreferenceBody,
} from "@/lib/typebox/billing";
import {
  getSubscriptionPlans,
  getSubscriptionSelf,
  getTopUpInfo,
  requestCreemPay,
  requestStripePay,
  subscriptionRequestCreemPay,
  subscriptionRequestStripePay,
  updateSubscriptionPreference,
} from "@/openapi";
import { unwrap } from "@/lib/utils/base";
import { Elysia } from "elysia";
import { ADMIN_HEADERS, deriveUpstream } from "../constants";

export const billingRoute = new Elysia({ prefix: "/billing" })
  .derive(deriveUpstream)
  .get("/topup-info", async ({ upstream }) => {
    const res = await getTopUpInfo({ headers: upstream.headers });
    return unwrap(res);
  })
  .get("/subscription-plans", async ({ upstream }) => {
    const hasUser = !!upstream.headers.cookie;
    const res = await getSubscriptionPlans({
      headers: hasUser ? upstream.headers : ADMIN_HEADERS,
    });
    if (res.status !== 200) return [];
    return processPlans(res.data.data);
  })
  .get("/subscription-self", async ({ upstream }) => {
    const res = await getSubscriptionSelf({ headers: upstream.headers });
    return unwrap(res);
  })
  .put(
    "/subscription-preference",
    async ({ body, upstream }) => {
      const res = await updateSubscriptionPreference(body, {
        headers: { ...upstream.headers },
      });
      return unwrap(res);
    },
    { body: subscriptionPreferenceBody },
  )
  .post(
    "/stripe-pay",
    async ({ body, upstream }) => {
      const res = await requestStripePay(body, {
        headers: { ...upstream.headers },
      });
      return unwrap(res);
    },
    { body: stripePayBody },
  )
  .post(
    "/creem-pay",
    async ({ body, upstream }) => {
      const res = await requestCreemPay(body, {
        headers: { ...upstream.headers },
      });
      return unwrap(res);
    },
    { body: creemPayBody },
  )
  .post(
    "/subscription/stripe-pay",
    async ({ body, upstream }) => {
      const res = await subscriptionRequestStripePay(body, {
        headers: { ...upstream.headers },
      });
      return unwrap(res);
    },
    { body: subscriptionPayBody },
  )
  .post(
    "/subscription/creem-pay",
    async ({ body, upstream }) => {
      const res = await subscriptionRequestCreemPay(body, {
        headers: { ...upstream.headers },
      });
      return unwrap(res);
    },
    { body: subscriptionPayBody },
  );
