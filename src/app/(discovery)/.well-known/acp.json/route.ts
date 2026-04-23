import { env } from "@/lib/config/env";

export const dynamic = "force-static";

const siteOrigin = new URL(env.appUrl).origin;

// ACP discovery document per
// https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/rfcs/rfc.discovery.md
// Schema is intentionally minimal: only the spec fields are emitted, with
// `services: ["checkout"]` declaring our /checkout_sessions endpoints.
// Merchant identity, OAuth metadata, and the OpenAPI URL live at their
// respective .well-known documents (oauth-authorization-server,
// oauth-protected-resource) and the BFF /api/openapi.
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
