import { t } from "elysia";

export const logsQuery = t.Object({
  p: t.Optional(t.Number()),
  page_size: t.Optional(t.Number()),
  type: t.Optional(t.Number()),
  start_timestamp: t.Optional(t.Number()),
  end_timestamp: t.Optional(t.Number()),
  token_name: t.Optional(t.String()),
  model_name: t.Optional(t.String()),
  group: t.Optional(t.String()),
  request_id: t.Optional(t.String()),
});

export const logsStatQuery = t.Object({
  type: t.Optional(t.Number()),
  start_timestamp: t.Optional(t.Number()),
  end_timestamp: t.Optional(t.Number()),
  token_name: t.Optional(t.String()),
  model_name: t.Optional(t.String()),
});
