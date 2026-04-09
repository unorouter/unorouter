import { t } from "elysia";

export const paginationQuery = t.Object({
  p: t.Optional(t.Number()),
  page_size: t.Optional(t.Number()),
});

export const verificationQuery = t.Object({
  email: t.String(),
  turnstile: t.Optional(t.String()),
});

export const twoFACodeBody = t.Object({
  code: t.String(),
});
