import { env } from "@/lib/config/env";

export const dynamic = "force-static";

export function GET() {
  return Response.redirect(`${env.siteOrigin}/api/openapi/json`, 308);
}
