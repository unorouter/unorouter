function clean<T extends Record<string, unknown>>(obj?: T): Partial<T> {
  if (!obj) return {};
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export const queryKeys = {
  searchIndex: () => ["search-index"] as const,
  pricing: () => ["pricing"] as const,
  models: () => ["models"] as const,
  statsLive: () => ["stats-live"] as const,
  statsHistory: () => ["stats-history"] as const,
  subscriptionPlans: () => ["subscription-plans"] as const,
  auth: () => ["auth"] as const,
  status: () => ["status"] as const,
  dashboardQuota: (startTs?: number, endTs?: number) =>
    ["dashboard-quota", startTs, endTs] as const,
  dashboardUptime: () => ["dashboard-uptime"] as const,
  tokens: (params?: { p?: number; keyword?: string }) =>
    ["tokens", clean(params)] as const,
  token: (id: number) => ["token", id] as const,
  userGroups: () => ["user-groups"] as const,
  userModels: () => ["user-models"] as const,
  affiliateCommissions: (params?: { p?: number; page_size?: number }) =>
    ["affiliate-commissions", clean(params)] as const,
  affiliateInvitees: (params?: { p?: number; page_size?: number }) =>
    ["affiliate-invitees", clean(params)] as const,
  usageLogs: (params?: Record<string, unknown>) =>
    ["usage-logs", clean(params)] as const,
  usageLogsStat: (params?: Record<string, unknown>) =>
    ["usage-logs-stat", clean(params)] as const,
  topUpInfo: () => ["topup-info"] as const,
  subscriptionSelf: () => ["subscription-self"] as const,
  billingPlans: () => ["billing-plans"] as const,
  twoFAStatus: () => ["2fa-status"] as const,
  passkeyStatus: () => ["passkey-status"] as const,
};
