import {
  getSubscriptionPlans,
  getSubscriptionSelf,
  getTopUpInfo,
  requestCreemPay,
  requestStripeAmount,
  subscriptionRequestCreemPay,
  subscriptionRequestStripePay,
  updateSubscriptionPreference,
} from "@/openapi";
import { processPlans } from "@/lib/api/subscription";
import { Elysia, t } from "elysia";
import { ADMIN_HEADERS, deriveUpstream } from "../constants";

export const billingRoute = new Elysia({ prefix: "/billing" })
  .derive(deriveUpstream)
  .get("/topup-info", async ({ upstream }) => {
    const res = await getTopUpInfo({ headers: upstream.headers });
    return res.data!;
  })
  .get("/subscription-plans", async () => {
    const res = await getSubscriptionPlans({ headers: ADMIN_HEADERS });
    if (res.status !== 200) return [];
    return processPlans(res.data.data);
  })
  .get("/subscription-self", async ({ upstream }) => {
    const res = await getSubscriptionSelf({ headers: upstream.headers });
    return res.data!;
  })
  .put(
    "/subscription-preference",
    async ({ body, upstream }) => {
      const res = await updateSubscriptionPreference(body, {
        headers: { ...upstream.headers, "Content-Type": "application/json" },
      });
      return res.data!;
    },
    {
      body: t.Object({
        billing_preference: t.String(),
      }),
    },
  )
  .post(
    "/stripe-pay",
    async ({ body, upstream }) => {
      const res = await requestStripeAmount(body, {
        headers: { ...upstream.headers, "Content-Type": "application/json" },
      });
      return res.data!;
    },
    {
      body: t.Object({
        amount: t.Number(),
        payment_method: t.String(),
        success_url: t.Optional(t.String()),
        cancel_url: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/creem-pay",
    async ({ body, upstream }) => {
      const res = await requestCreemPay(body, {
        headers: { ...upstream.headers, "Content-Type": "application/json" },
      });
      return res.data!;
    },
    {
      body: t.Object({
        product_id: t.String(),
        payment_method: t.String(),
      }),
    },
  )
  .post(
    "/subscription/stripe-pay",
    async ({ body, upstream }) => {
      const res = await subscriptionRequestStripePay(body, {
        headers: { ...upstream.headers, "Content-Type": "application/json" },
      });
      return res.data!;
    },
    {
      body: t.Object({
        plan_id: t.Number(),
      }),
    },
  )
  .post(
    "/subscription/creem-pay",
    async ({ body, upstream }) => {
      const res = await subscriptionRequestCreemPay(body, {
        headers: { ...upstream.headers, "Content-Type": "application/json" },
      });
      return res.data!;
    },
    {
      body: t.Object({
        plan_id: t.Number(),
      }),
    },
  );
