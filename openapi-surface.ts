// The new-api spec has every admin and relay route; generating all of it made
// src/openapi.ts 24k lines for the hundred or so this app calls. Add a route
// here before using its generated function.
const USED_OPERATIONS = new Set([
  "DELETE /api/notify/subscription",
  "DELETE /api/token/{id}",
  "DELETE /api/user/bindings/{binding_type}",
  "DELETE /api/user/guest/provider-consents",
  "DELETE /api/user/partner/redemption/{id}",
  "DELETE /api/user/passkey",
  "DELETE /api/user/self",
  "DELETE /api/user/self/provider-consents",
  "GET /api/data/flow/self",
  "GET /api/data/self",
  "GET /api/data/summary",
  "GET /api/log/by-request",
  "GET /api/log/self",
  "GET /api/log/self/perf",
  "GET /api/log/self/stat",
  "GET /api/log/stat",
  "GET /api/mj/self",
  "GET /api/model_status/buckets",
  "GET /api/model_status/components",
  "GET /api/model_status/page_compact",
  "GET /api/notify/events",
  "GET /api/notify/vapid",
  "GET /api/oauth/email/bind",
  "GET /api/oauth/state",
  "GET /api/oauth/{provider}",
  "GET /api/perf-metrics",
  "GET /api/perf-metrics/summary",
  "GET /api/pricing/catalog",
  "GET /api/pricing/catalog/model",
  "GET /api/pricing/counts",
  "GET /api/pricing/model-groups",
  "GET /api/pricing/vendors",
  "GET /api/rankings",
  "GET /api/rankings/model",
  "GET /api/rankings/price-drops",
  "GET /api/rankings/price-history",
  "GET /api/reset_password",
  "GET /api/status",
  "GET /api/subscription/orders/self",
  "GET /api/subscription/plans",
  "GET /api/subscription/self",
  "GET /api/task/self",
  "GET /api/token/search",
  "GET /api/user/2fa/status",
  "GET /api/user/aff/commissions",
  "GET /api/user/aff/invitees",
  "GET /api/user/billing-portal",
  "GET /api/user/groups",
  "GET /api/user/guest/own-purpose-objection",
  "GET /api/user/guest/provider-consents",
  "GET /api/user/logout",
  "GET /api/user/partner/redemption",
  "GET /api/user/passkey",
  "GET /api/user/self",
  "GET /api/user/self/own-purpose-objection",
  "GET /api/user/self/provider-consents",
  "GET /api/user/self/terms-acceptance",
  "GET /api/user/token",
  "GET /api/user/topup/info",
  "GET /api/user/topup/self",
  "GET /api/verification",
  "GET /api/verify/methods",
  "GET /dashboard/billing/subscription",
  "GET /v1/video/generations/{task_id}",
  "POST /api/notify/subscription",
  "POST /api/oauth/exchange",
  "POST /api/subscription/creem/pay",
  "POST /api/subscription/delopay/pay",
  "POST /api/subscription/nowpayments/pay",
  "POST /api/subscription/stripe/pay",
  "POST /api/token/",
  "POST /api/token/{id}/key",
  "POST /api/user/2fa/disable",
  "POST /api/user/2fa/enable",
  "POST /api/user/2fa/setup",
  "POST /api/user/aff_transfer",
  "POST /api/user/creem/pay",
  "POST /api/user/delopay/pay",
  "POST /api/user/guest/provider-consents",
  "POST /api/user/login",
  "POST /api/user/login/2fa",
  "POST /api/user/nowpayments/pay",
  "POST /api/user/partner/grant",
  "POST /api/user/partner/redemption",
  "POST /api/user/passkey/register/begin",
  "POST /api/user/passkey/register/finish",
  "POST /api/user/passkey/verify/begin",
  "POST /api/user/passkey/verify/finish",
  "POST /api/user/register",
  "POST /api/user/reset",
  "POST /api/user/self/provider-consents",
  "POST /api/user/self/terms-acceptance",
  "POST /api/user/setting",
  "POST /api/user/stripe/pay",
  "POST /api/user/topup",
  "POST /api/verify",
  "POST /pg/chat/completions",
  "POST /v1/video/generations",
  "PUT /api/subscription/self/preference",
  "PUT /api/token/",
  "PUT /api/user/guest/own-purpose-objection",
  "PUT /api/user/self",
  "PUT /api/user/self/timeout",
  "PUT /api/user/self/own-purpose-objection",
]);

// Schemas imported by name but not reachable from a kept operation.
const KEEP_SCHEMAS: string[] = [];

type Spec = {
  paths?: Record<string, Record<string, unknown>>;
  components?: { schemas?: Record<string, unknown> };
};

function refsIn(node: unknown, out: Set<string>) {
  if (Array.isArray(node)) for (const n of node) refsIn(n, out);
  else if (node && typeof node === "object")
    for (const [k, v] of Object.entries(node)) {
      if (k === "$ref" && typeof v === "string")
        out.add(v.replace("#/components/schemas/", ""));
      else refsIn(v, out);
    }
}

export function pruneSpec<T extends Spec>(spec: T): T {
  const paths: NonNullable<Spec["paths"]> = {};
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    const kept = Object.fromEntries(
      Object.entries(item).filter(([method]) =>
        USED_OPERATIONS.has(`${method.toUpperCase()} ${path}`),
      ),
    );
    if (Object.keys(kept).length > 0) paths[path] = kept;
  }
  const schemas = spec.components?.schemas ?? {};
  const keep = new Set(KEEP_SCHEMAS);
  refsIn(paths, keep);
  for (let size = 0; size !== keep.size;) {
    size = keep.size;
    for (const name of [...keep]) refsIn(schemas[name], keep);
  }
  return {
    ...spec,
    paths,
    components: {
      ...spec.components,
      schemas: Object.fromEntries(
        Object.entries(schemas).filter(([name]) => keep.has(name)),
      ),
    },
  };
}
