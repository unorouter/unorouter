import { t } from "elysia";

export const subscriptionPreferenceBody = t.Object({
  billing_preference: t.String(),
});

// Redeeming a gift card or redemption code. Upstream deliberately returns one
// generic failure for every reason, so a caller cannot probe a code's state.
export const redeemBody = t.Object({
  key: t.String({ minLength: 1 }),
});

export const stripePayBody = t.Object({
  amount: t.Number(),
  payment_method: t.String(),
  success_url: t.Optional(t.String()),
  cancel_url: t.Optional(t.String()),
});

export const creemPayBody = t.Object({
  product_id: t.String(),
  payment_method: t.String(),
  // Pay-what-you-want. Omitted for a preset tile, which charges the product's
  // own price; when present, upstream overrides it via Creem's custom_price.
  amount: t.Optional(t.Number()),
});

export const nowPaymentsPayBody = t.Object({
  amount: t.Number(),
  payment_method: t.String(),
  success_url: t.Optional(t.String()),
  cancel_url: t.Optional(t.String()),
});

export const deloPayPayBody = t.Object({
  amount: t.Number(),
  payment_method: t.String(),
});

export const subscriptionPayBody = t.Object({
  plan_id: t.Number(),
});

export const transactionsQuery = t.Object({
  p: t.Optional(t.Number()),
  page_size: t.Optional(t.Number()),
});

export const billingPortalQuery = t.Object({
  provider: t.Optional(
    t.Union([t.Literal("stripe"), t.Literal("creem")], {
      error: "Unsupported payment provider",
    }),
  ),
});
