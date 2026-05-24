import { APP_VALUES, type TranslationKey } from "./constants";
import { env } from "./env";
import { WEBMCP_TOOLS } from "./webmcp-tools";


// Loose translator shape (avoid next-intl's own type: triggers TS2589).
type Translator = (
  key: TranslationKey,
  values?: Record<string, string | number | Date>,
) => string;

// MCP Server Card SEP-2127; published at both well-known paths (scanner disagreement).
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
    capabilities: { tools: {} },
    tools,
  };
}
