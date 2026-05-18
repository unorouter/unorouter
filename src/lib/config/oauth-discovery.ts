import { env } from "@/lib/config/env";
import { OAUTH_SCOPES } from "@/lib/config/oauth-scopes";

const apiOrigin = new URL(env.apiUrl).origin;

// Builds /.well-known/oauth-authorization-server (RFC 8414) +
// /.well-known/openid-configuration (OIDC 1.0). Delta is userinfo_endpoint
// and claims_supported.
//
// issuer = API origin (not site): where go-oidc signs tokens, JWKS lives.
// registration_endpoint omitted: new-api lacks RFC 7591, advertising would
// 404 auto-register agents.
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
