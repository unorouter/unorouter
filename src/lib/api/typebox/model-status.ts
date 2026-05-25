import { t } from "elysia";

export const modelStatusPageQuery = t.Object({
  bucket: t.Optional(t.String()),
  hours: t.Optional(t.Numeric()),
});

export const modelStatusPageCompactQuery = modelStatusPageQuery;
