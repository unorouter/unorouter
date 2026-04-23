import { buildMcpServerCard } from "@/lib/config/mcp-server-card";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

// Discovery alias for /.well-known/mcp/server-card.json. Some agents probe
// /.well-known/mcp.json, others the SEP-2127 path; both return the same
// SEP-2127 server card so either probe finds a valid document.
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
