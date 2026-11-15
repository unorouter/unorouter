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

const CHECKOUT = {
  stripe: "Stripe checkout session",
  creem: "Creem checkout session",
  nowpayments: "NowPayments crypto checkout",
  delopay: "DeloPay PayPal checkout",
};

const payDetail = (
  method: keyof typeof CHECKOUT,
  kind: "topup" | "subscription",
): { summary: string } & Record<string, unknown> => {
  const checkout = CHECKOUT[method];
  const via = `via ${checkout.replace(" session", "")} URL`;
  return {
    summary: `Start a ${checkout} for a ${kind === "topup" ? "balance top-up" : "subscription plan"}`,
    "x-payment-info": {
      intent: "session",
      method,
      amount: null,
      currency: "USD",
      description:
        kind === "topup"
          ? `Top-up balance ${via}`
          : `Subscribe to a plan ${via}`,
    },
  };
};

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
      detail: payDetail("stripe", "topup"),
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
      detail: payDetail("creem", "topup"),
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
      detail: payDetail("nowpayments", "topup"),
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
      detail: payDetail("delopay", "topup"),
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
      detail: payDetail("stripe", "subscription"),
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
      detail: payDetail("creem", "subscription"),
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
      detail: payDetail("nowpayments", "subscription"),
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
      detail: payDetail("delopay", "subscription"),
    },
  );
