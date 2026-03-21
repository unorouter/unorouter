import { t } from "elysia";

export const transferQuotaBody = t.Object({
  quota: t.Number(),
});
