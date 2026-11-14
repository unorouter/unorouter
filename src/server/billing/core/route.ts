import {
  billingPortalQuery,
  creemPayBody,
  deloPayPayBody,
  nowPaymentsPayBody,
  redeemBody,
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
  topUp,
  updateSubscriptionPreference,
} from "@/openapi";
import { Elysia } from "elysia";
import { deriveUpstream } from "@/server/constants";

const xPaymentInfo = (
  method: "stripe" | "creem" | "nowpayments" | "delopay",
  description: string,
): Record<string, unknown> => ({
  "x-payment-info": {
    intent: "session",
    method,
    amount: null,
    currency: "USD",
    description,
  },
});

export const billingRoute = new Elysia({ prefix: "/core" })
  .derive(deriveUpstream)
  .get("/topup-info", async ({ upstream }) =>
    unwrap(await getTopUpInfo({ headers: upstream.headers })),
  )
  .get("/subscription-plans", async ({ upstream }) =>
    unwrap(await getSubscriptionPlans({ headers: upstream.headers })),
  )
  .get("/subscription-self", async ({ upstream }) =>
    unwrap(await getSubscriptionSelf({ headers: upstream.headers })),
  )
  .get(
    "/portal",
    async ({ query, upstream }) =>
      unwrap(await getBillingPortal(query, { headers: upstream.headers })),
    { query: billingPortalQuery },
  )
  .get(
    "/transactions/topups",
    async ({ query, upstream }) =>
      unwrap(await getUserTopUps(query, { headers: upstream.headers })),
    { query: transactionsQuery },
  )
  .get(
    "/transactions/orders",
    async ({ query, upstream }) =>
      unwrap(
        await getUserSubscriptionOrders(query, {
          headers: upstream.headers,
        }),
      ),
    { query: transactionsQuery },
  )
  .put(
    "/subscription-preference",
    async ({ body, upstream }) =>
      unwrap(
        await updateSubscriptionPreference(body, {
          headers: upstream.headers,
        }),
      ),
    { body: subscriptionPreferenceBody },
  )
  .post(
    "/redeem",
    async ({ body, upstream }) =>
      unwrap(await topUp(body, { headers: upstream.headers })),
    { body: redeemBody },
  )
  .post(
    "/stripe-pay",
    async ({ body, upstream }) =>
      unwrap(
        await requestStripePay(body, {
          headers: upstream.headers,
        }),
      ),
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
      return unwrap(
        await requestCreemPay(
          { ...body, amount: body.amount ?? 0 },
          {
            headers: upstream.headers,
          },
        ),
      );
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
    async ({ body, upstream }) =>
      unwrap(
        await requestNowPaymentsPay(body, {
          headers: upstream.headers,
        }),
      ),
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
    async ({ body, upstream }) =>
      unwrap(
        await requestDeloPayPay(body, {
          headers: upstream.headers,
        }),
      ),
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
    async ({ body, upstream }) =>
      unwrap(
        await subscriptionRequestStripePay(body, {
          headers: upstream.headers,
        }),
      ),
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
    async ({ body, upstream }) =>
      unwrap(
        await subscriptionRequestCreemPay(body, {
          headers: upstream.headers,
        }),
      ),
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
    async ({ body, upstream }) =>
      unwrap(
        await subscriptionRequestNowPaymentsPay(body, {
          headers: upstream.headers,
        }),
      ),
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
    async ({ body, upstream }) =>
      unwrap(
        await subscriptionRequestDeloPayPay(body, {
          headers: upstream.headers,
        }),
      ),
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
