import { t, type Static } from "elysia";

export const verifyProbeBody = t.Object({
  url: t.String({ minLength: 1, maxLength: 2048 }),
  headers: t.Record(t.String(), t.String()),
  reqBody: t.Unknown(),
});
