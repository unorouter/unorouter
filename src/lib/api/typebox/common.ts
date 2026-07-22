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

// Login-time 2FA verify carries the AuthFlow token from the password step
// (upstream is stateless; the pending user is looked up strictly by flow_token).
export const twoFALoginBody = t.Object({
  code: t.String(),
  flow_token: t.Optional(t.String()),
});
