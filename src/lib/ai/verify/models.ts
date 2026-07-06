import type { VerifyProvider } from "./types";

export const CURATED_MODELS: Record<VerifyProvider, readonly string[]> = {
  anthropic: [
    "claude-opus-4-6",
    "claude-opus-4-7",
    "claude-opus-4-8",
    "claude-sonnet-4-6",
    "claude-haiku-4-5",
  ],
  openai: ["gpt-5.5", "gpt-5.4", "gpt-5.1", "o3", "o4-mini"],
  gemini: ["gemini-3.1-pro-preview", "gemini-3.1-flash", "gemini-2.5-pro"],
};

const MODEL_TO_PROVIDER: Record<string, VerifyProvider> = Object.fromEntries(
  (Object.keys(CURATED_MODELS) as VerifyProvider[]).flatMap((p) =>
    CURATED_MODELS[p].map((m) => [m, p] as const),
  ),
);

const PROVIDER_VENDOR: Record<VerifyProvider, string> = {
  anthropic: "anthropic",
  openai: "openai",
  gemini: "google",
};

export function vendorForRow(provider: VerifyProvider, model?: string): string {
  const inferred = model ? providerForModel(model) : null;
  return PROVIDER_VENDOR[inferred ?? provider];
}

export function providerForModel(model: string): VerifyProvider | null {
  const id = model.trim().toLowerCase();
  if (!id) return null;
  if (MODEL_TO_PROVIDER[id]) return MODEL_TO_PROVIDER[id];
  if (id.includes("claude")) return "anthropic";
  if (id.includes("gemini")) return "gemini";
  if (
    id.startsWith("gpt-") ||
    id.startsWith("o1") ||
    id.startsWith("o3") ||
    id.startsWith("o4") ||
    id.startsWith("chatgpt")
  )
    return "openai";
  return null;
}
