import { processPlans } from "@/lib/api/subscription";
import {
  billingPortalQuery,
  creemPayBody,
  deloPayPayBody,
  nowPaymentsPayBody,
  stripePayBody,
  subscriptionPayBody,
  subscriptionPreferenceBody,
  transactionsQuery,
} from "@/lib/api/typebox/billing";
import { unwrap } from "@/lib/utils/base";
import {
  getBillingPortal,
  getSubscriptionPlans,
  getSubscriptionSelf,
  getTopUpInfo,
  getUserSubscriptionOrders,
  getUserTopUps,
  requestCreemPay,
  requestDeloPayPay,
  requestNowPaymentsPay,
  requestStripePay,
  subscriptionRequestCreemPay,
  subscriptionRequestDeloPayPay,
  subscriptionRequestNowPaymentsPay,
  subscriptionRequestStripePay,
  updateSubscriptionPreference,
} from "@/openapi";
import { Elysia } from "elysia";
import { ADMIN_HEADERS, deriveUpstream } from "@/server/constants";

const xPaymentInfo = (
  method: "stripe" | "creem" | "nowpayments" | "delopay",
  description: string,
) =>
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
    const res = await getTopUpInfo(
      hasUser ? { headers: upstream.headers } : { headers: ADMIN_HEADERS },
    );
    return unwrap(res);
  })
  .get("/subscription-plans", async ({ upstream }) => {
    const hasUser = !!upstream.headers.cookie;
    const res = await getSubscriptionPlans(
      hasUser ? { headers: upstream.headers } : { headers: ADMIN_HEADERS },
    );
    if (res.status !== 200) return [];
    return processPlans(res.data.data);
  })
  .get("/subscription-self", async ({ upstream }) => {
    const res = await getSubscriptionSelf({ headers: upstream.headers });
    return unwrap(res);
  })
  .get(
    "/portal",
    async ({ query, upstream }) => {
      const res = await getBillingPortal(query, { headers: upstream.headers });
      return unwrap(res);
    },
    { query: billingPortalQuery },
  )
  .get(
    "/transactions/topups",
    async ({ query, upstream }) => {
      const res = await getUserTopUps(query, { headers: upstream.headers });
      return unwrap(res);
    },
    { query: transactionsQuery },
  )
  .get(
    "/transactions/orders",
    async ({ query, upstream }) => {
      const res = await getUserSubscriptionOrders(query, {
        headers: upstream.headers,
      });
      return unwrap(res);
    },
    { query: transactionsQuery },
  )
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
      // Zero mirrors an omitted amount: upstream only treats amount > 0 as a
      // pay-what-you-want override.
      const res = await requestCreemPay(
        { ...body, amount: body.amount ?? 0 },
        {
          headers: { ...upstream.headers },
        },
      );
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
    "/nowpayments-pay",
    async ({ body, upstream }) => {
      const res = await requestNowPaymentsPay(body, {
        headers: { ...upstream.headers },
      });
      return unwrap(res);
    },
    {
      body: nowPaymentsPayBody,
      detail: {
        summary: "Start a NowPayments crypto checkout for a balance top-up",
        ...xPaymentInfo(
          "nowpayments",
          "Top-up balance via NowPayments crypto checkout URL",
        ),
      },
    },
  )
  .post(
    "/delopay-pay",
    async ({ body, upstream }) => {
      const res = await requestDeloPayPay(body, {
        headers: { ...upstream.headers },
      });
      return unwrap(res);
    },
    {
      body: deloPayPayBody,
      detail: {
        summary: "Start a DeloPay PayPal checkout for a balance top-up",
        ...xPaymentInfo(
          "delopay",
          "Top-up balance via DeloPay PayPal checkout URL",
        ),
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
  )
  .post(
    "/subscription/nowpayments-pay",
    async ({ body, upstream }) => {
      const res = await subscriptionRequestNowPaymentsPay(body, {
        headers: { ...upstream.headers },
      });
      return unwrap(res);
    },
    {
      body: subscriptionPayBody,
      detail: {
        summary: "Start a NowPayments crypto checkout for a subscription plan",
        ...xPaymentInfo(
          "nowpayments",
          "Subscribe to a plan via NowPayments crypto checkout URL",
        ),
      },
    },
  )
  .post(
    "/subscription/delopay-pay",
    async ({ body, upstream }) => {
      const res = await subscriptionRequestDeloPayPay(body, {
        headers: { ...upstream.headers },
      });
      return unwrap(res);
    },
    {
      body: subscriptionPayBody,
      detail: {
        summary: "Start a DeloPay PayPal checkout for a subscription plan",
        ...xPaymentInfo(
          "delopay",
          "Subscribe to a plan via DeloPay PayPal checkout URL",
        ),
      },
    },
  );
