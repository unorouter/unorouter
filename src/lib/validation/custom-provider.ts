// Custom (bring-your-own) OpenAI-compatible provider validation. Local-first entity: no server route,
// these schemas drive the client form + the SQLocal row narrowing.

import { Type as t, type Static } from "@sinclair/typebox/type";
import { TOKENIZER_PRESETS } from "@/lib/ai/chat/tokenizer";
import { MAX_NAME_LEN } from "./rp";

// Request format. Only the installed @ai-sdk/openai-compatible path for now; the union is the extension point.
export const CUSTOM_PROVIDER_FORMATS = ["openai-compatible"] as const;
export const customProviderFormat = t.Union(
  CUSTOM_PROVIDER_FORMATS.map((f) => t.Literal(f)),
);
export type CustomProviderFormat = Static<typeof customProviderFormat>;

// Tokenizer lives PER MODEL (different model families tokenize differently; a mismatch mis-budgets history).
// A selection is either a built-in preset (TOKENIZER_PRESETS) or `hf:<owner/repo|url>` for a user-supplied
// HuggingFace tokenizer (downloaded + cached on demand). "auto" infers from the model key name. Counts drive
// budgeting only, not billing (see src/lib/ai/chat/tokenizer.ts).
export const customProviderTokenizer = t.Union([
  ...TOKENIZER_PRESETS.map((tk) => t.Literal(tk)),
  t.TemplateLiteral([t.Literal("hf:"), t.String()]),
]);
export type CustomProviderTokenizer = Static<typeof customProviderTokenizer>;

const MAX_URL_LEN = 2_048;
const MAX_KEY_LEN = 4_096;
const MAX_MODELS = 256;

// A model is either a chat model (default) or an image model (in-chat image gen picker; dispatched
// browser-direct to {base}/images/generations, never our server).
export const customProviderModelType = t.Union([
  t.Literal("text"),
  t.Literal("image"),
]);
export type CustomProviderModelType = Static<typeof customProviderModelType>;

// One selectable model: key = the real id sent to the API; label = display name; tokenizer = which tokenizer
// to count this model's history with ("auto" = infer from the key); type absent = text.
export const customProviderModel = t.Object({
  key: t.String({ minLength: 1, maxLength: 256 }),
  label: t.String({ minLength: 1, maxLength: 256 }),
  tokenizer: t.Optional(customProviderTokenizer),
  type: t.Optional(customProviderModelType),
});
export type CustomProviderModel = Static<typeof customProviderModel>;

export const customProviderBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  baseUrl: t.String({ minLength: 1, maxLength: MAX_URL_LEN }),
  apiKey: t.String({ maxLength: MAX_KEY_LEN }),
  format: customProviderFormat,
  models: t.Array(customProviderModel, { maxItems: MAX_MODELS }),
});
export type CustomProviderBody = Static<typeof customProviderBody>;

// RHF form mirror with defaults. New model rows default tokenizer to "auto".
export const customProviderForm = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN, default: "" }),
  baseUrl: t.String({ minLength: 1, maxLength: MAX_URL_LEN, default: "" }),
  apiKey: t.String({ maxLength: MAX_KEY_LEN, default: "" }),
  format: t.Union(
    CUSTOM_PROVIDER_FORMATS.map((f) => t.Literal(f)),
    { default: "openai-compatible" },
  ),
  models: t.Array(customProviderModel, { maxItems: MAX_MODELS, default: [] }),
});
export type CustomProviderForm = Static<typeof customProviderForm>;
