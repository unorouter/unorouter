import { t, type Static } from "elysia";

export const quotaQuery = t.Object({
  start_timestamp: t.Optional(t.Number()),
  end_timestamp: t.Optional(t.Number()),
});

export const flowQuery = t.Object({
  start_timestamp: t.Number(),
  end_timestamp: t.Number(),
});

export const flowRow = t.Object({
  token_id: t.Optional(t.Number()),
  token_name: t.Optional(t.String()),
  use_group: t.Optional(t.String()),
  model_name: t.Optional(t.String()),
  channel_id: t.Optional(t.Number()),
  channel_name: t.Optional(t.String()),
  token_used: t.Optional(t.Number()),
  count: t.Optional(t.Number()),
  quota: t.Optional(t.Number()),
});

export type FlowRow = Static<typeof flowRow>;
