import {
  buildOAuthDiscoveryDoc,
  jsonDiscoveryResponse,
} from "@/lib/config/oauth-discovery";

export const dynamic = "force-static";

// OpenID Connect Discovery 1.0 document mirrored on the public site origin.
// Same shape as oauth-authorization-server plus the OIDC-specific fields
// (userinfo_endpoint, claims_supported). Pointed at the API origin so a token
// minted through this discovery flow works against the real backend.
export function GET() {
  return jsonDiscoveryResponse(buildOAuthDiscoveryDoc({ includeOidc: true }));
}
