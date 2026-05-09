import { t } from "elysia";

export const taskLogsQuery = t.Object({
  p: t.Optional(t.Number()),
  page_size: t.Optional(t.Number()),
  start_timestamp: t.Optional(
    t.Number({ description: "Start timestamp in seconds" }),
  ),
  end_timestamp: t.Optional(
    t.Number({ description: "End timestamp in seconds" }),
  ),
  platform: t.Optional(t.String()),
  task_id: t.Optional(t.String()),
  status: t.Optional(t.String()),
  action: t.Optional(t.String()),
});
