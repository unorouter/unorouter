import { env } from "@/lib/config/env";
import { OAUTH_SCOPES } from "@/lib/config/oauth-scopes";

export const dynamic = "force-static";

const apiOrigin = new URL(env.apiUrl).origin;

// RFC 8414 authorization-server metadata mirrored on the public site origin
// so agent crawlers that check the site origin directly (most do, without
// following RFC 9728 pointers) find it in one fetch. The canonical document
// is emitted by go-oidc on the API origin at the same path; this mirror
// serves the same URLs so tokens issued here work against the API origin.
//
// issuer is the API origin (not the site origin). That's where go-oidc signs
// tokens, where JWKS lives, and where /oauth/v1/token accepts requests.
export function GET() {
  const body = {
    issuer: apiOrigin,
    authorization_endpoint: `${apiOrigin}/oauth/v1/authorize`,
    token_endpoint: `${apiOrigin}/oauth/v1/token`,
    jwks_uri: `${apiOrigin}/oauth/v1/jwks`,
    // registration_endpoint intentionally omitted: the upstream new-api Go
    // service does not implement RFC 7591 dynamic client registration today.
    // Advertising the URL caused well-behaved agents to 404 on auto-register.
    // Re-add when the upstream ships an actual /oauth/v1/register handler.
    scopes_supported: ["openid", "offline_access", ...OAUTH_SCOPES],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
      "none",
    ],
    code_challenge_methods_supported: ["S256"],
    id_token_signing_alg_values_supported: ["RS256"],
    subject_types_supported: ["public"],
  };
  return Response.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
