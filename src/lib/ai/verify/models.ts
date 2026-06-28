import type { VerifyProvider } from "./types";

// Curated, hand-maintained list of the proprietary models worth testing, grouped
// by the API format that serves them. The tester picks the format FROM the model
// so a user can never send a gpt model on the Anthropic endpoint. Extend by adding
// an id here (and, for a new tier, the provider config patterns).
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

// All curated ids flattened to their format, for reverse lookup.
const MODEL_TO_PROVIDER: Record<string, VerifyProvider> = Object.fromEntries(
  (Object.keys(CURATED_MODELS) as VerifyProvider[]).flatMap((p) =>
    CURATED_MODELS[p].map((m) => [m, p] as const),
  ),
);

// The VendorIcon key for a format. The three test formats map 1:1 to a vendor.
const PROVIDER_VENDOR: Record<VerifyProvider, string> = {
  anthropic: "anthropic",
  openai: "openai",
  gemini: "google",
};

// Vendor-icon name for a row. Prefers the model id (so a custom/non-curated id
// still resolves by its prefix), falling back to the format. Returns the format
// vendor when nothing is inferable.
export function vendorForRow(
  provider: VerifyProvider,
  model?: string,
): string {
  const inferred = model ? providerForModel(model) : null;
  return PROVIDER_VENDOR[inferred ?? provider];
}

// Which format serves this model id. Exact curated match wins; otherwise infer
// from the name prefix so a typed-in custom id still routes correctly. null when
// nothing matches (leave the user's chosen format untouched).
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
