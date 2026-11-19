import { t } from "elysia";

export const paginationQuery = t.Object({
  p: t.Optional(t.Number()),
  page_size: t.Optional(t.Number()),
});

export const verificationQuery = t.Object({
  email: t.String(),
  turnstile: t.Optional(t.String()),
});

// flow_token comes from the setup response and ties the code to that enrollment.
export const twoFAEnableBody = t.Object({
  code: t.String(),
  flow_token: t.String(),
});

// Login-time 2FA verify carries the AuthFlow token from the password step
// (upstream is stateless; the pending user is looked up strictly by flow_token).
export const twoFALoginBody = t.Object({
  code: t.String(),
  flow_token: t.Optional(t.String()),
  // Upstream defaults an empty method to "2fa" and rejects anything else, so
  // send it explicitly rather than relying on that default holding.
  method: t.Optional(t.String()),
});

// Limits mirror the gateway's ContactRequest validation.
export const contactBody = t.Object({
  name: t.String({ maxLength: 100 }),
  email: t.String({ maxLength: 254 }),
  subject: t.String({ maxLength: 200 }),
  message: t.String({ minLength: 10, maxLength: 5000 }),
  turnstile: t.Optional(t.String()),
});
