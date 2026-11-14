import { Type as t, type Static } from "@sinclair/typebox/type";
import { MAX_NAME_LEN } from "./rp";
import { tokenizerRef } from "./tokenizer";

const CUSTOM_PROVIDER_FORMATS = ["openai-compatible"] as const;
export type CustomProviderFormat = (typeof CUSTOM_PROVIDER_FORMATS)[number];

const MAX_URL_LEN = 2_048;
const MAX_KEY_LEN = 4_096;
// OpenRouter-sized lists run past 300; the old cap of 256 failed the form silently.
export const MAX_MODELS = 1000;

const customProviderModelType = t.Union([
  t.Literal("text"),
  t.Literal("image"),
]);

const customProviderModel = t.Object({
  key: t.String({ minLength: 1, maxLength: 256 }),
  label: t.String({ minLength: 1, maxLength: 256 }),
  tokenizer: t.Optional(tokenizerRef),
  type: t.Optional(customProviderModelType),
});
export type CustomProviderModel = Static<typeof customProviderModel>;

export type CustomProviderBody = {
  name: string;
  baseUrl: string;
  apiKey: string;
  format: CustomProviderFormat;
  proxy?: boolean;
  models: CustomProviderModel[];
};

export const customProviderForm = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN, default: "" }),
  baseUrl: t.String({ minLength: 1, maxLength: MAX_URL_LEN, default: "" }),
  apiKey: t.String({ maxLength: MAX_KEY_LEN, default: "" }),
  format: t.Union(
    CUSTOM_PROVIDER_FORMATS.map((f) => t.Literal(f)),
    { default: "openai-compatible" },
  ),
  proxy: t.Boolean({ default: false }),
  models: t.Array(
    t.Object({
      ...customProviderModel.properties,
      label: t.String({ maxLength: 256 }),
    }),
    { maxItems: MAX_MODELS, default: [] },
  ),
});
export type CustomProviderForm = Static<typeof customProviderForm>;
