import { t } from "elysia";

export const transferQuotaBody = t.Object({
  quota: t.Number(),
});

export const affiliatePaginationQuery = t.Object({
  p: t.Optional(t.String()),
  page_size: t.Optional(t.String()),
});
