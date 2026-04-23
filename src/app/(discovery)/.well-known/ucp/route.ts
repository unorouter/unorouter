import { env } from "@/lib/config/env";

export const dynamic = "force-static";

const siteOrigin = new URL(env.appUrl).origin;
const ns = `ai.${env.appName.toLowerCase()}`;

// UCP (Universal Commerce Protocol) profile per ucp.dev 2026-04-08 spec.
// Served at /.well-known/ucp (no extension) on the public site origin.
//
// signing_keys is required by spec but empty here: we don't sign UCP
// negotiation messages yet. Discovery still works (agents that ignore
// signatures find all services and capabilities); populate with JWK
// public keys when we add signed checkout/quote flows.
export function GET() {
  const version = "2026-04-08";
  const body = {
    ucp: {
      version,
      services: {
        [`${ns}.api`]: [
          {
            version,
            spec: `${siteOrigin}/en/docs`,
            transport: "rest",
            endpoint: `${siteOrigin}/api`,
            schema: `${siteOrigin}/api/openapi/json`,
          },
        ],
      },
      capabilities: {
        [`${ns}.models`]: [{ version }],
        [`${ns}.checkout`]: [{ version }],
        [`${ns}.tokens`]: [{ version }],
        [`${ns}.subscription`]: [{ version }],
      },
      payment_handlers: {
        stripe_checkout: {
          endpoint: `${siteOrigin}/api/billing/stripe-pay`,
          flow: "redirect",
        },
        creem_checkout: {
          endpoint: `${siteOrigin}/api/billing/creem-pay`,
          flow: "redirect",
        },
      },
    },
    signing_keys: [],
  };
  return Response.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
