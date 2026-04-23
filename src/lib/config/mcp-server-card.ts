import { APP_VALUES, type TranslationKey } from "./constants";
import { env } from "./env";
import { WEBMCP_TOOLS } from "./webmcp-tools";

const siteOrigin = new URL(env.appUrl).origin;

// Loose translator shape that both useTranslations() and getTranslations()
// satisfy. We avoid importing next-intl's own type because
// Awaited<ReturnType<typeof getTranslations>> expands into a deep recursive
// generic that triggers TS2589 here.
type Translator = (
  key: TranslationKey,
  values?: Record<string, string | number | Date>,
) => string;

// MCP Server Card per SEP-2127 (still draft).
// https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127
//
// We publish at TWO paths because scanners disagree on the canonical URL:
//   - /.well-known/mcp/server-card.json (SEP-2127, Cloudflare's scanner)
//   - /.well-known/mcp.json             (older convention some agents probe)
// Both routes import this builder so the document stays a single source of
// truth. Tools are derived from WEBMCP_TOOLS so the card mirrors what the
// homepage actually registers via navigator.modelContext.
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
      homepage: siteOrigin,
    },
    transport: {
      type: "webmcp",
      webmcp: { homepage: siteOrigin },
    },
    capabilities: { tools: {} },
    tools,
  };
}
