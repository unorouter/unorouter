import { env } from "@/lib/config/env";
import { OAUTH_SCOPES } from "@/lib/config/oauth-scopes";

const apiOrigin = new URL(env.apiUrl).origin;

// Shared builder for the two discovery documents we mirror on the site origin:
// /.well-known/oauth-authorization-server (RFC 8414) and
// /.well-known/openid-configuration (OIDC Discovery 1.0). RFC 8414 section 3
// explicitly allows the OIDC document to satisfy both contracts since it's a
// superset; the only delta is the OIDC-specific fields (userinfo_endpoint,
// claims_supported). Keeping one source prevents the two docs from drifting.
//
// issuer is the API origin (not the site origin). That's where go-oidc signs
// tokens, where JWKS lives, and where /oauth/v1/token accepts requests.
//
// registration_endpoint intentionally omitted: the upstream new-api Go service
// does not implement RFC 7591 dynamic client registration today. Advertising
// the URL caused well-behaved agents to 404 on auto-register. Re-add when the
// upstream ships an actual /oauth/v1/register handler.
export function buildOAuthDiscoveryDoc(opts: { includeOidc: boolean }) {
  const base = {
    issuer: apiOrigin,
    authorization_endpoint: `${apiOrigin}/oauth/v1/authorize`,
    token_endpoint: `${apiOrigin}/oauth/v1/token`,
    jwks_uri: `${apiOrigin}/oauth/v1/jwks`,
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
  if (!opts.includeOidc) {
    return base;
  }
  return {
    ...base,
    userinfo_endpoint: `${apiOrigin}/oauth/v1/userinfo`,
    claims_supported: ["sub", "iss", "aud", "exp", "iat"],
  };
}

export function jsonDiscoveryResponse(body: object) {
  return Response.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
