import { Type as t, type Static } from "@sinclair/typebox/type";
import { msg } from "../config/constants";

export type VerifyVerdictValue = "genuine" | "suspicious" | "unverified";

export const VERIFY_PROVIDERS = ["anthropic", "openai", "gemini"] as const;
export type VerifyProviderValue = (typeof VERIFY_PROVIDERS)[number];

const MAX_URL_LEN = 2_048;
const MAX_KEY_LEN = 4_096;

export const modelTesterForm = t.Object({
  provider: t.Union(
    VERIFY_PROVIDERS.map((p) => t.Literal(p)),
    {
      default: "anthropic",
    },
  ),
  baseUrl: t.String({
    minLength: 1,
    maxLength: MAX_URL_LEN,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  apiKey: t.String({ maxLength: MAX_KEY_LEN, default: "" }),
  model: t.String({
    minLength: 1,
    maxLength: 256,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  publish: t.Boolean({ default: false }),
});
export type ModelTesterForm = Static<typeof modelTesterForm>;
