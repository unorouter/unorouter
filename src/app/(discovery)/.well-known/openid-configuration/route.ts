import { env } from "@/lib/config/env";
import { OAUTH_SCOPES } from "@/lib/config/oauth-scopes";

export const dynamic = "force-static";

const apiOrigin = new URL(env.apiUrl).origin;

// OpenID Connect Discovery 1.0 document mirrored on the public site origin.
// Same shape as oauth-authorization-server plus the OIDC-specific fields
// (userinfo_endpoint, id_token_signing_alg_values_supported,
// subject_types_supported). Pointed at the API origin so a token minted
// through this discovery flow works against the real backend.
export function GET() {
  const body = {
    issuer: apiOrigin,
    authorization_endpoint: `${apiOrigin}/oauth/v1/authorize`,
    token_endpoint: `${apiOrigin}/oauth/v1/token`,
    userinfo_endpoint: `${apiOrigin}/oauth/v1/userinfo`,
    jwks_uri: `${apiOrigin}/oauth/v1/jwks`,
    // registration_endpoint omitted: upstream lacks an RFC 7591 handler. See
    // matching note in oauth-authorization-server/route.ts.
    scopes_supported: ["openid", "offline_access", ...OAUTH_SCOPES],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
      "none",
    ],
    code_challenge_methods_supported: ["S256"],
    claims_supported: ["sub", "iss", "aud", "exp", "iat"],
  };
  return Response.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
