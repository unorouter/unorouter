import { env } from "@/lib/config/env";
import { parseJwks, stripPrivateFields } from "@/server/auth/web-bot-auth/keys";


const ns = `ai.${env.appName.toLowerCase()}`;

export function GET() {
  const version = "2026-04-08";
  const signingKeys = parseJwks(process.env.WEB_BOT_AUTH_PUBLIC_JWKS).map(
    stripPrivateFields,
  );
  const body = {
    ucp: {
      version,
      services: {
        [`${ns}.api`]: [
          {
            version,
            spec: `${env.siteOrigin}/en/docs`,
            transport: "rest",
            endpoint: `${env.siteOrigin}/api`,
            schema: `${env.siteOrigin}/api/openapi/json`,
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
          endpoint: `${env.siteOrigin}/api/billing/stripe-pay`,
          flow: "redirect",
        },
        creem_checkout: {
          endpoint: `${env.siteOrigin}/api/billing/creem-pay`,
          flow: "redirect",
        },
      },
    },
    signing_keys: signingKeys,
  };
  return Response.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
