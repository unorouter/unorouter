import { t } from "elysia";

export const updateSelfBody = t.Object({
  password: t.Optional(t.String()),
  original_password: t.Optional(t.String()),
  email: t.Optional(t.String()),
  verification_code: t.Optional(t.String()),
  display_name: t.Optional(t.String()),
});

export const passkeyCredentialBody = t.Object({
  id: t.String(),
  rawId: t.String(),
  response: t.Object({
    clientDataJSON: t.String(),
    attestationObject: t.String(),
  }),
  type: t.Literal("public-key"),
  authenticatorAttachment: t.Optional(t.String()),
  clientExtensionResults: t.Optional(t.Record(t.String(), t.Unknown())),
});

export const emailBindQuery = t.Object({
  email: t.String(),
  code: t.String(),
});

export const updateSettingBody = t.Object({
  quota_warning_enabled: t.Boolean(),
  notify_type: t.String(),
  quota_warning_threshold: t.Number(),
  accept_unset_model_ratio_model: t.Boolean(),
  record_ip_log: t.Boolean(),
  notification_email: t.Optional(t.String()),
  webhook_url: t.Optional(t.String()),
  webhook_secret: t.Optional(t.String()),
  bark_url: t.Optional(t.String()),
  gotify_url: t.Optional(t.String()),
  gotify_token: t.Optional(t.String()),
  gotify_priority: t.Optional(t.Number()),
  upstream_model_update_notify_enabled: t.Optional(t.Nullable(t.Boolean())),
});
