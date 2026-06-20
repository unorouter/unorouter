import { routing } from "@/i18n/routing";
import { env } from "@/lib/config/env";

export const dynamic = "force-static";

const defaultLocale = routing.defaultLocale;

// ACP discovery per https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/rfcs/rfc.discovery.md
export function GET() {
  const body = {
    protocol: {
      name: "acp",
      version: "2026-01-16",
      supported_versions: ["2026-01-16"],
      documentation_url: "https://agenticcommerce.dev",
    },
    api_base_url: `${env.siteOrigin}/api`,
    transports: ["rest"],
    merchant: {
      name: env.appName,
      url: env.siteOrigin,
      support_email: env.supportEmail,
      tos_url: `${env.siteOrigin}/${defaultLocale}/terms`,
      privacy_url: `${env.siteOrigin}/${defaultLocale}/privacy`,
      documentation_url: `${env.siteOrigin}/${defaultLocale}/docs`,
    },
    auth: {
      oauth_authorization_server: `${env.siteOrigin}/.well-known/oauth-authorization-server`,
      oauth_protected_resource: `${env.siteOrigin}/.well-known/oauth-protected-resource`,
    },
    endpoints: {
      checkout_create: `${env.siteOrigin}/api/checkout-sessions`,
      topup_stripe: `${env.siteOrigin}/api/billing/stripe-pay`,
      topup_creem: `${env.siteOrigin}/api/billing/creem-pay`,
      subscription_stripe: `${env.siteOrigin}/api/billing/subscription/stripe-pay`,
      subscription_creem: `${env.siteOrigin}/api/billing/subscription/creem-pay`,
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
