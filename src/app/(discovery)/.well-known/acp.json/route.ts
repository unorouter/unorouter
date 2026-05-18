import { routing } from "@/i18n/routing";
import { env } from "@/lib/config/env";

export const dynamic = "force-static";

const siteOrigin = new URL(env.appUrl).origin;
const defaultLocale = routing.defaultLocale;

// ACP discovery document per
// https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/rfcs/rfc.discovery.md
// `services: ["checkout"]` declares our /checkout_sessions endpoints; the
// merchant block identifies us to agents and links to legal documents.
// Legal pages are served at the default locale because the discovery doc
// itself is locale-agnostic and next-intl uses localePrefix "always".
export function GET() {
  const body = {
    protocol: {
      name: "acp",
      version: "2026-01-16",
      supported_versions: ["2026-01-16"],
      documentation_url: "https://agenticcommerce.dev",
    },
    api_base_url: `${siteOrigin}/api`,
    transports: ["rest"],
    merchant: {
      name: env.appName,
      url: siteOrigin,
      support_email: env.supportEmail,
      tos_url: `${siteOrigin}/${defaultLocale}/terms`,
      privacy_url: `${siteOrigin}/${defaultLocale}/privacy`,
      documentation_url: `${siteOrigin}/${defaultLocale}/docs`,
    },
    auth: {
      oauth_authorization_server: `${siteOrigin}/.well-known/oauth-authorization-server`,
      oauth_protected_resource: `${siteOrigin}/.well-known/oauth-protected-resource`,
    },
    endpoints: {
      checkout_create: `${siteOrigin}/api/checkout-sessions`,
      topup_stripe: `${siteOrigin}/api/billing/stripe-pay`,
      topup_creem: `${siteOrigin}/api/billing/creem-pay`,
      subscription_stripe: `${siteOrigin}/api/billing/subscription/stripe-pay`,
      subscription_creem: `${siteOrigin}/api/billing/subscription/creem-pay`,
    },
    capabilities: {
      services: ["checkout"],
      supported_currencies: ["usd"],
    },
  };
  return Response.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
