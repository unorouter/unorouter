import { t } from "elysia";

export const logsQuery = t.Object({
  p: t.Optional(t.String()),
  page_size: t.Optional(t.String()),
  type: t.Optional(t.String()),
  start_timestamp: t.Optional(t.String()),
  end_timestamp: t.Optional(t.String()),
  token_name: t.Optional(t.String()),
  model_name: t.Optional(t.String()),
  group: t.Optional(t.String()),
  request_id: t.Optional(t.String()),
});

export const logsStatQuery = t.Object({
  type: t.Optional(t.String()),
  start_timestamp: t.Optional(t.String()),
  end_timestamp: t.Optional(t.String()),
  token_name: t.Optional(t.String()),
  model_name: t.Optional(t.String()),
});
