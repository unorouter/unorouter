import {
  buildOAuthDiscoveryDoc,
  jsonDiscoveryResponse,
} from "@/lib/config/oauth-discovery";

export const dynamic = "force-static";

// RFC 8414 mirror on site origin (most crawlers skip RFC 9728 pointers); same URLs as canonical doc.
export function GET() {
  return jsonDiscoveryResponse(buildOAuthDiscoveryDoc({ includeOidc: false }));
}
