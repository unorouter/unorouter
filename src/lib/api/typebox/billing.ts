import { t } from "elysia";

export const subscriptionPreferenceBody = t.Object({
  billing_preference: t.String(),
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
});

export const subscriptionPayBody = t.Object({
  plan_id: t.Number(),
});
