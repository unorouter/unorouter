import {
  buildOAuthDiscoveryDoc,
  jsonDiscoveryResponse,
} from "@/lib/config/oauth-discovery";

export const dynamic = "force-static";

// RFC 8414 authorization-server metadata mirrored on the public site origin so
// agent crawlers that check the site origin directly (most do, without
// following RFC 9728 pointers) find it in one fetch. The canonical document is
// emitted by go-oidc on the API origin at the same path; this mirror serves
// the same URLs so tokens issued here work against the API origin.
export function GET() {
  return jsonDiscoveryResponse(buildOAuthDiscoveryDoc({ includeOidc: false }));
}
