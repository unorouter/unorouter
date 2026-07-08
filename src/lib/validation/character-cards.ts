import type { Static } from "elysia";
import { t } from "elysia";

export const importCardByUrlBody = t.Object({
  url: t.String({ minLength: 1, maxLength: 2048 }),
});
export type ImportCardByUrlBody = Static<typeof importCardByUrlBody>;
