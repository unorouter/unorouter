// The single dependency-injection seam between the isomorphic assembly pipeline and its two hosts:
// the server stream path (real Turso/R2/Tavily/new-api services) and the browser custom-provider
// transport (local DB reads, the user's own endpoint, no web search). Everything that touches a
// server secret or a server-only data source is injected here; the rest of the pipeline is pure.

import type { ProcessedModel } from "@/lib/api/pricing";
import type { LoadedConvContext } from "@/lib/types";
import type { TriggerOps } from "@/lib/ai/chat/triggers/types";
import type { FreeModelGenerate } from "@/lib/ai/chat/free-model-race";
import type { StreamMessages } from "./transforms";

// Inlay image produced by a runImgGen start trigger; the client persists the bytes from finish-meta.
export type InlayImage = {
  id: string;
  dataBase64: string;
  mimeType: string;
  sizeBytes: number;
};

// Result of the web-search stage. Server resolves it via Tavily; client returns disabled.
export type WebSearchResolution = {
  effectiveWebSearch: boolean;
  searchSystemMessage: string | undefined;
};

export type SemanticHit = { id: string; text: string };

// Conversation settings carried by LoadedConvContext (model, web search, memory, sampling, vars, ...).
export type ConvSettings = NonNullable<LoadedConvContext>["settings"];

export type AssemblerDeps = {
  // Catalog model metadata (price/context window/caps). Server: getPricingSummary; client: pricing query map (undefined for custom ids).
  getModelInfo: (model: string) => ProcessedModel | undefined;

  // Replace inline PDF file parts with extracted text. Both paths use the shared isomorphic unpdf extractor.
  inlinePdfText: (messages: StreamMessages) => Promise<StreamMessages>;

  // Web search gate + execution. Default: POST /chat/web-search (Tavily server-side); custom: disabled.
  // Returns the formatted [web search] system block, or undefined when no search ran / no results.
  webSearch: (args: {
    apiKey: string;
    lastUserText: string | null;
    settings: ConvSettings | undefined;
  }) => Promise<string | undefined>;

  // Free-model race primitives for rolling-summary + web-search classification. Server: getProvider; client: the custom provider's models.
  runFreeModelRace: {
    listFreeModels: () => Promise<string[]>;
    generate: FreeModelGenerate;
  };

  // Semantic retrieval (lore embeddings). Server: /v1/embeddings; client: the custom provider's embedding model or empty.
  retrieveSemantic: (
    apiKey: string,
    query: string,
    candidates: { id: string; text: string }[],
    opts: { topK: number },
  ) => Promise<SemanticHit[]>;

  // V1 lowLevelAccess trigger ops bridge. Server: direct service calls; client: POST /chat/trigger-op/*.
  triggerOps: (
    apiKey: string,
    model: string,
    inlayMedia: InlayImage[],
  ) => TriggerOps;

  // Telemetry hook (PostHog chat_web_search_executed). No-op on the client.
  onWebSearchExecuted?: (info: {
    engine: string;
    contextSize: string;
    resultCount: number;
  }) => void;
};
