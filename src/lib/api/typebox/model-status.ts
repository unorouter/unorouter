import { t } from "elysia";

export const modelStatusPageQuery = t.Object({
  bucket: t.Optional(t.String()),
  hours: t.Optional(t.Numeric()),
});

export const modelStatusBucketsQuery = t.Object({
  model: t.String(),
  bucket: t.Optional(t.String()),
  hours: t.Optional(t.Numeric()),
});

export const modelStatusIncidentsQuery = t.Object({
  since: t.Optional(t.Numeric()),
  until: t.Optional(t.Numeric()),
  model: t.Optional(t.String()),
});
