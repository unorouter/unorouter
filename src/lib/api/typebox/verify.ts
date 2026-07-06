import { t, type Static } from "elysia";

export const verifyProvider = t.Union([
  t.Literal("anthropic"),
  t.Literal("openai"),
  t.Literal("gemini"),
]);

export const verifyProbeBody = t.Object({
  provider: verifyProvider,
  url: t.String({ minLength: 1, maxLength: 2048 }),
  headers: t.Record(t.String(), t.String()),
  reqBody: t.Unknown(),
});
export type VerifyProbeBody = Static<typeof verifyProbeBody>;
