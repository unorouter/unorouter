import type { PricingCatalogDetail } from "@/openapi";
import type { LoadedConvContext } from "@/lib/types";
import type { TriggerOps } from "@/lib/ai/chat/triggers/types";
import type { FreeModelGenerate } from "@/lib/ai/chat/free-model-race";
import type { StreamMessages } from "./transforms";

export type InlayImage = {
  id: string;
  dataBase64: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};

export type WebSearchResolution = {
  effectiveWebSearch: boolean;
  searchSystemMessage: string | undefined;
};

export type SemanticHit = { id: string; text: string };

export type ConvSettings = NonNullable<LoadedConvContext>["settings"];

export type AssemblerDeps = {
  getModelInfo: (model: string) => Promise<PricingCatalogDetail | undefined>;

  upstreamTarget?: { endpoint: string; url: string };

  inlinePdfText: (messages: StreamMessages) => Promise<StreamMessages>;

  webSearch: (args: {
    apiKey: string;
    lastUserText: string | null;
    settings: ConvSettings | undefined;
  }) => Promise<string | undefined>;

  runFreeModelRace: {
    listFreeModels: () => Promise<string[]>;
    generate: FreeModelGenerate;
  };

  runUtilityLLM: FreeModelGenerate;

  retrieveSemantic: (
    apiKey: string,
    query: string,
    candidates: { id: string; text: string }[],
    opts: { topK: number },
  ) => Promise<SemanticHit[]>;

  triggerOps: (
    apiKey: string,
    model: string,
    inlayMedia: InlayImage[],
  ) => TriggerOps;

  onWebSearchExecuted?: (info: {
    engine: string;
    contextSize: string;
    resultCount: number;
  }) => void;
};
