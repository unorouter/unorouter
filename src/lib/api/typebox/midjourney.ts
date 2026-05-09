import { t } from "elysia";

export const midjourneyLogsQuery = t.Object({
  p: t.Optional(t.Number()),
  page_size: t.Optional(t.Number()),
  mj_id: t.Optional(t.String()),
  start_timestamp: t.Optional(
    t.String({ description: "Start timestamp in milliseconds" }),
  ),
  end_timestamp: t.Optional(
    t.String({ description: "End timestamp in milliseconds" }),
  ),
});
