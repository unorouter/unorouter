// Custom (bring-your-own) OpenAI-compatible provider validation. Local-first entity: no server route,
// these schemas drive the client form + the SQLocal row narrowing.

import { Type as t, type Static } from "@sinclair/typebox/type";
import { MAX_NAME_LEN } from "./rp";

// Request format. Only the installed @ai-sdk/openai-compatible path for now; the union is the extension point.
export const CUSTOM_PROVIDER_FORMATS = ["openai-compatible"] as const;
export const customProviderFormat = t.Union(
  CUSTOM_PROVIDER_FORMATS.map((f) => t.Literal(f)),
);
export type CustomProviderFormat = Static<typeof customProviderFormat>;

// Tokenizer drives history-budget estimation only (approximated via gpt-tokenizer + a per-option fudge factor).
export const CUSTOM_PROVIDER_TOKENIZERS = [
  "cl100k",
  "o200k",
  "claude",
  "gemini",
] as const;
export const customProviderTokenizer = t.Union(
  CUSTOM_PROVIDER_TOKENIZERS.map((tk) => t.Literal(tk)),
);
export type CustomProviderTokenizer = Static<typeof customProviderTokenizer>;

// Budget fudge multiplier: gpt-tokenizer is cl100k; Claude/Gemini run ~15% denser, so scale up to avoid under-budgeting.
export const TOKENIZER_FUDGE: Record<CustomProviderTokenizer, number> = {
  cl100k: 1,
  o200k: 1,
  claude: 1.15,
  gemini: 1.15,
};

const MAX_URL_LEN = 2_048;
const MAX_KEY_LEN = 4_096;
const MAX_MODELS = 256;

// One selectable model: key = the real id sent to the API; label = display name.
export const customProviderModel = t.Object({
  key: t.String({ minLength: 1, maxLength: 256 }),
  label: t.String({ minLength: 1, maxLength: 256 }),
});
export type CustomProviderModel = Static<typeof customProviderModel>;

export const customProviderBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  baseUrl: t.String({ minLength: 1, maxLength: MAX_URL_LEN }),
  apiKey: t.String({ maxLength: MAX_KEY_LEN }),
  format: customProviderFormat,
  tokenizer: customProviderTokenizer,
  models: t.Array(customProviderModel, { maxItems: MAX_MODELS }),
});
export type CustomProviderBody = Static<typeof customProviderBody>;

// RHF form mirror with defaults.
export const customProviderForm = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN, default: "" }),
  baseUrl: t.String({ minLength: 1, maxLength: MAX_URL_LEN, default: "" }),
  apiKey: t.String({ maxLength: MAX_KEY_LEN, default: "" }),
  format: t.Union(
    CUSTOM_PROVIDER_FORMATS.map((f) => t.Literal(f)),
    { default: "openai-compatible" },
  ),
  tokenizer: t.Union(
    CUSTOM_PROVIDER_TOKENIZERS.map((tk) => t.Literal(tk)),
    { default: "cl100k" },
  ),
  models: t.Array(customProviderModel, { maxItems: MAX_MODELS, default: [] }),
});
export type CustomProviderForm = Static<typeof customProviderForm>;
