import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenQuery } from "@/lib/types/eden";

export const queryKeys = {
  // Auth & Status
  auth: () => ["auth"] as const,
  status: () => ["status"] as const,
  twoFAStatus: () => ["2fa-status"] as const,
  passkeyStatus: () => ["passkey-status"] as const,

  // Dashboard
  dashboardQuota: (params?: EdenQuery<typeof rpc.api.dashboard.quota>) =>
    ["dashboard-quota", params] as const,
  dashboardUptime: () => ["dashboard-uptime"] as const,

  // Tokens
  tokens: (params?: EdenQuery<typeof rpc.api.token.search>) =>
    ["tokens", params] as const,
  token: (id: EdenArgs<typeof rpc.api.token, "get">["id"]) =>
    ["token", id] as const,
  bestKey: () => ["best-key"] as const,
  userGroups: () => ["user-groups"] as const,
  userModels: () => ["user-models"] as const,

  // Billing & Subscriptions
  topUpInfo: () => ["topup-info"] as const,
  subscriptionSelf: () => ["subscription-self"] as const,
  billingPlans: () => ["billing-plans"] as const,
  subscriptionPlans: () => ["subscription-plans"] as const,

  // Affiliate
  affiliateCommissions: (
    params?: EdenQuery<typeof rpc.api.affiliate.commissions>,
  ) => ["affiliate-commissions", params] as const,
  affiliateInvitees: (params?: EdenQuery<typeof rpc.api.affiliate.invitees>) =>
    ["affiliate-invitees", params] as const,

  // Logs
  usageLogs: (params?: EdenQuery<typeof rpc.api.logs>) =>
    ["usage-logs", params] as const,
  usageLogsStat: (params?: EdenQuery<typeof rpc.api.logs.stat>) =>
    ["usage-logs-stat", params] as const,

  // Chat
  conversations: (keyword?: string) => ["conversations", keyword] as const,
  chatMeta: (id: string) => ["chat-meta", id] as const,
  chatMessages: (id: string) => ["chat-messages", id] as const,
  sharedConversation: (shareId: string) =>
    ["shared-conversation", shareId] as const,

  // Pricing & Search
  pricing: () => ["pricing"] as const,
  models: () => ["models"] as const,
  searchIndex: () => ["search-index"] as const,
  statsLive: () => ["stats-live"] as const,
  statsHistory: () => ["stats-history"] as const,
};
