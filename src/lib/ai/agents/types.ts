// Agent pipeline contract (Marinara-style): the built-in abstraction for chat behaviors that run an
// auxiliary LLM call around the main generation (summary/memory, illustrator/image-gen). Distinct from the
// Risu trigger VM, which stays the user-authored scripting surface. Isomorphic: agents reach the LLM only
// through the injected AgentRuntime.

import type { FreeModelGenerate } from "@/lib/ai/chat/free-model-race";
import type { InlayImage } from "@/lib/ai/chat/pipeline/deps";

// pre_generation injects into the prompt; post_processing amends the landed message.
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

// Injected LLM caps. generateImage absent on hosts that can't generate (e.g. custom-provider path).
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

// What an agent is allowed to do. The runner refuses to APPLY a result whose required capability is not
// declared (a misconfigured or future agent can't silently corrupt state). Designed-in now so adding the
// approval flow later (destructive caps -> user sign-off) needs no contract change. Marinara parity.
//  - inject_context: append to the system block (summary, context_injection). Safe.
//  - generate_image: produce an inlay image (illustrator). Safe.
//  - write_vars / write_lorebook: mutate persisted chat state. DESTRUCTIVE - gate before apply.
export type AgentCapability =
  "inject_context" | "generate_image" | "write_vars" | "write_lorebook";

export const DESTRUCTIVE_CAPABILITIES: readonly AgentCapability[] = [
  "write_vars",
  "write_lorebook",
];

// The capability each result type requires to be applied.
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

export type AgentDefinition = {
  id: string;
  phase: AgentPhase;
  // Declared up front; the runner gates result application against these.
  capabilities: readonly AgentCapability[];
  // Cheap sync gate; skip when false (memory off, no image host, ...).
  enabled: (ctx: AgentContext, settings: AgentSettings) => boolean;
  run: (
    ctx: AgentContext,
    runtime: AgentRuntime,
    settings: AgentSettings,
  ) => Promise<AgentResult>;
};
