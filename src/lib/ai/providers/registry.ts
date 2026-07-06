import { DEFAULT_ROLE_FLAGS, type ProviderAdapter } from "./types";
import { deepseekAdapter } from "./deepseek";
import { glmAdapter } from "./glm";
import { geminiAdapter, geminiThinkingAdapter } from "./gemini";
import {
  claude45Adapter,
  claudeLegacyAdapter,
  claudeOpus5Adapter,
} from "./claude";
import { openaiAdapter } from "./openai";

const PROVIDER_ADAPTERS: ProviderAdapter[] = [
  deepseekAdapter,
  glmAdapter,
  geminiThinkingAdapter,
  geminiAdapter,
  claudeOpus5Adapter,
  claude45Adapter,
  claudeLegacyAdapter,
  openaiAdapter,
];

export function resolveAdapter(modelName: string): ProviderAdapter {
  const name = modelName ?? "";
  for (const adapter of PROVIDER_ADAPTERS) {
    if (adapter.match(name)) return adapter;
  }
  return { name: "default", match: () => true, roleFlags: DEFAULT_ROLE_FLAGS };
}
