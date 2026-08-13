import { Type as t, type Static } from "@sinclair/typebox/type";
import { msg } from "../config/constants";

export const VERIFY_VERDICTS = ["genuine", "suspicious", "unverified"] as const;
export const verifyVerdict = t.Union(VERIFY_VERDICTS.map((v) => t.Literal(v)));
export type VerifyVerdictValue = Static<typeof verifyVerdict>;

export const VERIFY_PROVIDERS = ["anthropic", "openai", "gemini"] as const;
export const verifyProviderValue = t.Union(
  VERIFY_PROVIDERS.map((p) => t.Literal(p)),
);
export type VerifyProviderValue = Static<typeof verifyProviderValue>;

export const probeOutcome = t.Object({
  label: t.String(),
  pass: t.Boolean(),
  signal: t.Union([t.String(), t.Null()]),
  muxFailure: t.Boolean(),
  transient: t.Boolean(),
  latencyMs: t.Number(),
});
export type ProbeOutcomeValue = Static<typeof probeOutcome>;

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
