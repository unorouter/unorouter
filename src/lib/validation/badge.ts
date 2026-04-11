import { Type as t } from "@sinclair/typebox/type";

export const badgeQuery = t.Object({
  locale: t.Optional(t.String()),
  theme: t.Optional(t.String()),
  ref: t.Optional(t.String()),
  format: t.Optional(t.Union([t.Literal("svg"), t.Literal("png")])),
});
