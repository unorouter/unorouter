import type { TranslationKey } from "./constants";

type WebMcpToolResult = {
  path: string;
  target?: string;
  resultKey?: TranslationKey;
};

type WebMcpToolDescriptor = {
  name: string;
  descriptionKey: TranslationKey;
  inputSchema: Record<string, unknown>;
  readOnly: boolean;
  resolve: (input: Record<string, unknown>) => WebMcpToolResult;
  resultKey: TranslationKey;
};

const sanitize = (raw: unknown, allowDots = false) => {
  const value = typeof raw === "string" ? raw.trim() : "";
  const re = allowDots ? /[^a-z0-9._-]/gi : /[^a-z0-9-]/gi;
  return value.replace(re, "").toLowerCase();
};

export const WEBMCP_TOOLS: WebMcpToolDescriptor[] = [
  {
    name: "open_models_catalog",
    descriptionKey: "WELL_KNOWN.MCP.TOOLS.OPEN_MODELS_CATALOG",
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
    resolve: () => ({ path: "/models" }),
    resultKey: "WELL_KNOWN.MCP.RESULTS.OPEN_MODELS_CATALOG",
  },
  {
    name: "open_pricing",
    descriptionKey: "WELL_KNOWN.MCP.TOOLS.OPEN_PRICING",
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
    resolve: () => ({ path: "/pricing" }),
    resultKey: "WELL_KNOWN.MCP.RESULTS.OPEN_PRICING",
  },
  {
    name: "open_docs",
    descriptionKey: "WELL_KNOWN.MCP.TOOLS.OPEN_DOCS",
    inputSchema: {
      type: "object",
      properties: {
        guide: {
          type: "string",
          description:
            "Integration guide slug. Omit to open the documentation index.",
        },
      },
    },
    readOnly: true,
    resolve: (input) => {
      const safe = sanitize(input.guide);
      if (!safe) {
        return {
          path: "/docs",
          resultKey: "WELL_KNOWN.MCP.RESULTS.OPEN_DOCS_INDEX",
        };
      }
      return { path: `/docs/${safe}`, target: safe };
    },
    resultKey: "WELL_KNOWN.MCP.RESULTS.OPEN_DOCS",
  },
  {
    name: "open_chat",
    descriptionKey: "WELL_KNOWN.MCP.TOOLS.OPEN_CHAT",
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
    resolve: () => ({ path: "/chat" }),
    resultKey: "WELL_KNOWN.MCP.RESULTS.OPEN_CHAT",
  },
  {
    name: "open_model",
    descriptionKey: "WELL_KNOWN.MCP.TOOLS.OPEN_MODEL",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description:
            "Model slug as shown in the catalog (e.g. claude-opus-4-7).",
        },
      },
      required: ["slug"],
    },
    readOnly: true,
    resolve: (input) => {
      const safe = sanitize(input.slug, true);
      if (!safe) {
        return {
          path: "/models",
          resultKey: "WELL_KNOWN.MCP.RESULTS.OPEN_MODEL_MISSING",
        };
      }
      return { path: `/models/${safe}`, target: safe };
    },
    resultKey: "WELL_KNOWN.MCP.RESULTS.OPEN_MODEL",
  },
];
