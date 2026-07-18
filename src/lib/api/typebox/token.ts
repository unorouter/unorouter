import { t } from "elysia";

export const tokenSearchQuery = t.Object({
  p: t.Optional(t.Number()),
  page_size: t.Optional(t.Number()),
  keyword: t.Optional(t.String()),
  token: t.Optional(t.String()),
});

export const createTokenBody = t.Object({
  name: t.String(),
  remain_quota: t.Number(),
  expired_time: t.Number(),
  unlimited_quota: t.Boolean(),
  model_limits_enabled: t.Boolean(),
  model_limits: t.String(),
  allow_ips: t.Nullable(t.String()),
  group: t.String(),
  cross_group_retry: t.Boolean(),
  group_mapping: t.Optional(t.String()),
});

export const updateTokenBody = t.Object({
  id: t.Number(),
  status: t.Number(),
  name: t.String(),
  remain_quota: t.Number(),
  expired_time: t.Number(),
  unlimited_quota: t.Boolean(),
  model_limits_enabled: t.Boolean(),
  model_limits: t.String(),
  allow_ips: t.Nullable(t.String()),
  group: t.String(),
  cross_group_retry: t.Boolean(),
  group_mapping: t.Optional(t.String()),
});
