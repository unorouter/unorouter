import {
  buildOAuthDiscoveryDoc,
  jsonDiscoveryResponse,
} from "@/lib/config/oauth-discovery";

export const dynamic = "force-static";

// OIDC Discovery 1.0 mirror on site origin; OIDC fields + API-origin URLs.
export function GET() {
  return jsonDiscoveryResponse(buildOAuthDiscoveryDoc({ includeOidc: true }));
}
