import { env } from "@/lib/config/env";
import { OAUTH_SCOPES } from "@/lib/config/oauth-scopes";

export const dynamic = "force-static";

const siteOrigin = new URL(env.appUrl).origin;
const apiOrigin = new URL(env.apiUrl).origin;

// RFC 9728 resource-server metadata on the public site origin. An agent that
// discovers the site through any entrypoint (sitemap, agent-card, or a
// direct link) can follow one fetch here to learn which authorization server
// issues tokens for our APIs. The authorization_servers value is the canonical
// issuer URL; the real RFC 8414 document lives on that origin and is emitted
// by go-oidc at /.well-known/oauth-authorization-server.
export function GET() {
  const body = {
    resource: siteOrigin,
    authorization_servers: [apiOrigin],
    jwks_uri: `${apiOrigin}/oauth/v1/jwks`,
    scopes_supported: OAUTH_SCOPES,
    bearer_methods_supported: ["header"],
    resource_signing_alg_values_supported: ["RS256"],
    resource_documentation: `${siteOrigin}/en/docs`,
  };
  return Response.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
