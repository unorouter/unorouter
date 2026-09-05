import { getTranslations } from "next-intl/server";
import { serverLocale } from "@/lib/utils/server";
import { APP_VALUES, type TranslationKey } from "./constants";
import { env } from "./env";
import { WEBMCP_TOOLS } from "./webmcp-tools";

type Translator = (
  key: TranslationKey,
  values?: Record<string, string | number | Date>,
) => string;

export function buildMcpServerCard(t: Translator) {
  const tools = WEBMCP_TOOLS.map((descriptor) => ({
    name: descriptor.name,
    description: t(descriptor.descriptionKey, APP_VALUES),
    inputSchema: descriptor.inputSchema,
    annotations: { readOnlyHint: descriptor.readOnly },
  }));

  return {
    version: "1.0",
    protocolVersion: "2025-06-18",
    serverInfo: {
      name: APP_VALUES.appName,
      version: "1.0.0",
      description: t("WELL_KNOWN.MCP.SERVER_DESCRIPTION", APP_VALUES),
      homepage: env.siteOrigin,
    },
    transport: {
      type: "webmcp",
      webmcp: { homepage: env.siteOrigin },
    },
    // Installable stdio server, published in the official MCP registry.
    registryName: "com.unorouter/mcp",
    packages: [
      {
        registryType: "npm",
        identifier: "unorouter-mcp",
        transport: { type: "stdio" },
        repository: "https://github.com/unorouter/unorouter-mcp",
      },
    ],
    capabilities: { tools: {} },
    tools,
  };
}

// Both well-known URIs are published conventions, so each path keeps
// responding; only the body is shared.
export async function mcpServerCardResponse() {
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
