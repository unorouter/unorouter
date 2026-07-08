import {
  buildOAuthDiscoveryDoc,
  jsonDiscoveryResponse,
} from "@/lib/config/oauth-discovery";

export const dynamic = "force-static";

export function GET() {
  return jsonDiscoveryResponse(buildOAuthDiscoveryDoc({ includeOidc: true }));
}
