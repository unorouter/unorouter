import { processPlans } from "@/lib/api/subscription";
import {
  creemPayBody,
  stripePayBody,
  subscriptionPayBody,
  subscriptionPreferenceBody,
} from "@/lib/api/typebox/billing";
import { unwrap } from "@/lib/utils/base";
import {
  getBillingPortal,
  getSubscriptionPlans,
  getSubscriptionSelf,
  getTopUpInfo,
  requestCreemPay,
  requestStripePay,
  subscriptionRequestCreemPay,
  subscriptionRequestStripePay,
  updateSubscriptionPreference,
} from "@/openapi";
import { Elysia } from "elysia";
import { ADMIN_HEADERS, deriveUpstream } from "@/server/constants";

// MPP x-payment-info per paymentauth.org draft-payment-discovery-00.
// intent "session": endpoints return checkout URLs, not fixed charges.
// amount null: user picks at checkout (top-up) or plan-dependent (sub).
// Record cast: openapi-types OperationObject has no x-* index.
const xPaymentInfo = (method: "stripe" | "creem", description: string) =>
  ({
    "x-payment-info": {
      intent: "session",
      method,
      amount: null,
      currency: "USD",
      description,
    },
  }) as Record<string, unknown>;

export const billingRoute = new Elysia({ prefix: "/core" })
  .derive(deriveUpstream)
  .get("/topup-info", async ({ upstream }) => {
    const hasUser = !!upstream.headers.cookie;
    const res = await getTopUpInfo({
      headers: hasUser ? upstream.headers : ADMIN_HEADERS,
    });
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
  .get("/portal", async ({ upstream }) => {
    const res = await getBillingPortal({ headers: upstream.headers });
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
    {
      body: stripePayBody,
      detail: {
        summary: "Start a Stripe checkout session for a balance top-up",
        ...xPaymentInfo("stripe", "Top-up balance via Stripe checkout URL"),
      },
    },
  )
  .post(
    "/creem-pay",
    async ({ body, upstream }) => {
      const res = await requestCreemPay(body, {
        headers: { ...upstream.headers },
      });
      return unwrap(res);
    },
    {
      body: creemPayBody,
      detail: {
        summary: "Start a Creem checkout session for a balance top-up",
        ...xPaymentInfo("creem", "Top-up balance via Creem checkout URL"),
      },
    },
  )
  .post(
    "/subscription/stripe-pay",
    async ({ body, upstream }) => {
      const res = await subscriptionRequestStripePay(body, {
        headers: { ...upstream.headers },
      });
      return unwrap(res);
    },
    {
      body: subscriptionPayBody,
      detail: {
        summary: "Start a Stripe checkout session for a subscription plan",
        ...xPaymentInfo(
          "stripe",
          "Subscribe to a plan via Stripe checkout URL",
        ),
      },
    },
  )
  .post(
    "/subscription/creem-pay",
    async ({ body, upstream }) => {
      const res = await subscriptionRequestCreemPay(body, {
        headers: { ...upstream.headers },
      });
      return unwrap(res);
    },
    {
      body: subscriptionPayBody,
      detail: {
        summary: "Start a Creem checkout session for a subscription plan",
        ...xPaymentInfo("creem", "Subscribe to a plan via Creem checkout URL"),
      },
    },
  );
