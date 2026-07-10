import { env } from "@/lib/config/env";
import { OAUTH_SCOPES } from "@/lib/config/oauth-scopes";


export function GET() {
  const body = {
    resource: env.siteOrigin,
    authorization_servers: [env.apiOrigin],
    jwks_uri: `${env.apiOrigin}/oauth/v1/jwks`,
    scopes_supported: OAUTH_SCOPES,
    bearer_methods_supported: ["header"],
    resource_signing_alg_values_supported: ["RS256"],
    resource_documentation: `${env.siteOrigin}/en/docs`,
  };
  return Response.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
