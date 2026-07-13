import { t } from "elysia";

export const modelStatusPageQuery = t.Object({
  bucket: t.Optional(t.String()),
  hours: t.Optional(t.Numeric()),
});

export const modelStatusPageCompactQuery = modelStatusPageQuery;

export const modelStatusBucketsQuery = t.Object({
  model: t.String({ minLength: 1 }),
  bucket: t.Optional(t.String()),
  hours: t.Optional(t.Numeric()),
});
