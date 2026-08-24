import type { FreeModelGenerate } from "@/lib/ai/chat/free-model-race";
import type { InlayImage } from "@/lib/ai/chat/pipeline/deps";

export type AgentPhase = "pre_generation" | "post_processing";

export type AgentContext = {
  apiKey: string;
  convId: string | null;
  model: string;
  phase: AgentPhase;
  recentMessages: { role: "user" | "assistant" | "system"; text: string }[];
  mainResponse: string | null; // set only in post_processing
  lastUserText: string | null;
};

export type AgentRuntime = {
  listFreeModels: () => Promise<string[]>;
  generate: FreeModelGenerate;
  generateImage?: (prompt: string) => Promise<InlayImage | null>;
};

export type AgentResult =
  | { type: "context_injection"; text: string }
  | { type: "inlay_image"; media: InlayImage; token: string; prompt: string }
  | { type: "summary"; summary: string; anchor: number; memoryBlock: string }
  | { type: "noop" };

export type AgentCapability =
  "inject_context" | "generate_image" | "write_vars" | "write_lorebook";

export const DESTRUCTIVE_CAPABILITIES: readonly AgentCapability[] = [
  "write_vars",
  "write_lorebook",
];

export const RESULT_CAPABILITY: Record<
  AgentResult["type"],
  AgentCapability | null
> = {
  context_injection: "inject_context",
  summary: "inject_context",
  inlay_image: "generate_image",
  noop: null,
};

export type AgentSettings = Record<string, unknown>;

export type AgentDefinition<S = AgentSettings> = {
  id: string;
  phase: AgentPhase;
  capabilities: readonly AgentCapability[];
  enabled: (ctx: AgentContext, settings: S) => boolean;
  run: (
    ctx: AgentContext,
    runtime: AgentRuntime,
    settings: S,
  ) => Promise<AgentResult>;
};
