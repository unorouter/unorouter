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
  subscription_plan: t.Optional(t.String()),
});

export const logsStatQuery = t.Object({
  type: t.Optional(t.Number()),
  start_timestamp: t.Optional(t.Number()),
  end_timestamp: t.Optional(t.Number()),
  token_name: t.Optional(t.String()),
  model_name: t.Optional(t.String()),
});

export const byRequestQuery = t.Object({ request_id: t.String() });

// Authoritative upstream record for one request; every field null when the
// upstream log row isn't found yet. Default() makes the absent-row response a
// single source of truth instead of a hand-built literal.
const nullableStr = t.Union([t.String(), t.Null()], { default: null });
const nullableNum = t.Union([t.Number(), t.Null()], { default: null });
export const byRequestResponse = t.Object({
  channel: nullableStr,
  quota: nullableNum,
  promptTokens: nullableNum,
  completionTokens: nullableNum,
  useTime: nullableNum,
  modelName: nullableStr,
  group: nullableStr,
});
