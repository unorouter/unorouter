import { t } from "elysia";

export const quotaQuery = t.Object({
  start_timestamp: t.Optional(t.String()),
  end_timestamp: t.Optional(t.String()),
});
