import { t } from "elysia";

// Quota is in quota units, not dollars: the UI converts with dollarsToQuota so
// the wire format matches upstream and no rounding happens in two places.
export const partnerRedemptionBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 20 }),
  quota: t.Number({ minimum: 1 }),
  expired_time: t.Optional(t.Number()),
});

export const partnerGrantBody = t.Object({
  user_id: t.Number({ minimum: 1 }),
  quota: t.Number({ minimum: 1 }),
});

export const partnerVoidParams = t.Object({
  id: t.String(),
});
