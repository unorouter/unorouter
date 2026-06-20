import { env } from "@/lib/config/env";

export const dynamic = "force-static";

// MPP scanners probe /openapi.json at site root; redirect to the canonical spec.
export function GET() {
  return Response.redirect(`${env.siteOrigin}/api/openapi/json`, 308);
}
