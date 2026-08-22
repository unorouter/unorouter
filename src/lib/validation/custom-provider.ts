import { Type as t, type Static } from "@sinclair/typebox/type";
import { MAX_NAME_LEN } from "./rp";
import { tokenizerRef } from "./tokenizer";

export const CUSTOM_PROVIDER_FORMATS = ["openai-compatible"] as const;
export const customProviderFormat = t.Union(
  CUSTOM_PROVIDER_FORMATS.map((f) => t.Literal(f)),
);
export type CustomProviderFormat = Static<typeof customProviderFormat>;

const MAX_URL_LEN = 2_048;
const MAX_KEY_LEN = 4_096;
const MAX_MODELS = 256;

export const customProviderModelType = t.Union([
  t.Literal("text"),
  t.Literal("image"),
]);

export const customProviderModel = t.Object({
  key: t.String({ minLength: 1, maxLength: 256 }),
  label: t.String({ minLength: 1, maxLength: 256 }),
  tokenizer: t.Optional(tokenizerRef),
  type: t.Optional(customProviderModelType),
});
export type CustomProviderModel = Static<typeof customProviderModel>;

export const customProviderBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  baseUrl: t.String({ minLength: 1, maxLength: MAX_URL_LEN }),
  apiKey: t.String({ maxLength: MAX_KEY_LEN }),
  format: customProviderFormat,
  proxy: t.Optional(t.Boolean()),
  models: t.Array(customProviderModel, { maxItems: MAX_MODELS }),
});
export type CustomProviderBody = Static<typeof customProviderBody>;

export const customProviderForm = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN, default: "" }),
  baseUrl: t.String({ minLength: 1, maxLength: MAX_URL_LEN, default: "" }),
  apiKey: t.String({ maxLength: MAX_KEY_LEN, default: "" }),
  format: t.Union(
    CUSTOM_PROVIDER_FORMATS.map((f) => t.Literal(f)),
    { default: "openai-compatible" },
  ),
  proxy: t.Boolean({ default: false }),
  models: t.Array(customProviderModel, { maxItems: MAX_MODELS, default: [] }),
});
export type CustomProviderForm = Static<typeof customProviderForm>;
