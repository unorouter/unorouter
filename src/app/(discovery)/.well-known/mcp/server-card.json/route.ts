import { buildMcpServerCard } from "@/lib/config/mcp-server-card";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

// SEP-2127 server card. Body lives in @/lib/config/mcp-server-card so
// /.well-known/mcp.json can serve the same document.
export async function GET() {
  const locale = await serverLocale();
  const t = await getTranslations({ locale });

  return Response.json(buildMcpServerCard(t), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
