import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Type as t, type Static } from "@sinclair/typebox/type";

export const NOTIFY_EVENT_TYPES = [
  "model_online",
  "model_offline",
  "model_price_change",
  "model_added",
  "model_removed",
  "model_bulk_change",
] as const;

export const notifyEventType = t.Union(
  NOTIFY_EVENT_TYPES.map((v) => t.Literal(v)),
);
export type NotifyEventType = Static<typeof notifyEventType>;

// The generated openapi NotifyEvent is WIDER than this (type: string, nullable
// topics) and omits the bulk_* digest fields, so an upstream body is not a
// store event until it has been checked.
export const notifyEventSchema = t.Object({
  id: t.String(),
  type: notifyEventType,
  ts: t.Number(),
  topics: t.Array(t.String(), { default: [] }),
  data: t.Object(
    {
      model: t.String(),
      free: t.Boolean({ default: false }),
      online: t.Optional(t.Boolean()),
      cheapest_ratio: t.Optional(t.Number()),
      prev_cheapest_ratio: t.Optional(t.Number()),
      cheapest_group: t.Optional(t.String()),
      // model_bulk_change only: the server collapsed a mass transition (e.g. an
      // operator re-enabling hundreds of channels) into one digest.
      bulk_event: t.Optional(
        t.Union(
          NOTIFY_EVENT_TYPES.filter((v) => v !== "model_bulk_change").map((v) =>
            t.Literal(v),
          ),
        ),
      ),
      bulk_count: t.Optional(t.Number()),
      bulk_free: t.Optional(t.Number()),
      models: t.Optional(t.Array(t.String())),
    },
    { additionalProperties: true },
  ),
});
export const notifyEventChecker = TypeCompiler.Compile(notifyEventSchema);
export type NotifyEvent = Static<typeof notifyEventSchema>;
