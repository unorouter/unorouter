import type { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";

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
  bestKey: () => ["best-key"] as const,

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
  midjourneyLogs: (params?: EdenQuery<typeof rpc.api.logs.midjourney>) =>
    ["midjourney-logs", params] as const,
  taskLogs: (params?: EdenQuery<typeof rpc.api.logs.task>) =>
    ["task-logs", params] as const,

  // Chat
  conversations: (keyword?: string) => ["conversations", keyword] as const,
  chatMeta: (id: string) => ["chat-meta", id] as const,
  chatMessages: (id: string) => ["chat-messages", id] as const,
  chatSettings: (id: string) => ["chat-settings", id] as const,
  chatBindings: (id: string) => ["chat-bindings", id] as const,
  taskStatus: (taskId: string) => ["task-status", taskId] as const,

  // RP entities
  characters: () => ["characters"] as const,
  character: (id: string) => ["character", id] as const,
  personas: () => ["personas"] as const,
  persona: (id: string) => ["persona", id] as const,
  lorebooks: () => ["lorebooks"] as const,
  lorebook: (id: string) => ["lorebook", id] as const,
  presets: () => ["sampling-presets"] as const,
  preset: (id: string) => ["sampling-preset", id] as const,

  // Pricing & Search
  pricing: () => ["pricing"] as const,
  searchIndex: () => ["search-index"] as const,
  statsHistory: () => ["stats-history"] as const,

  // Rankings
  rankings: (period?: string) => ["rankings", period] as const,

  // Performance Metrics
  perfMetricsSummary: (hours: number) =>
    ["perf-metrics", "summary", hours] as const,
  perfMetrics: (modelName: string, hours: number) =>
    ["perf-metrics", modelName, hours] as const,

  // Model Status
  modelStatusPage: (bucket: string, hours: number) =>
    ["model-status", "page", bucket, hours] as const,
  modelStatusComponents: () => ["model-status", "components"] as const,

  // Image generation: sessions (history list) + snapshots (the unit of
  // submission). Each session contains many snapshots; chevrons walk the
  // snapshot list inside a session.
  generationSessionList: (
    params?: EdenQuery<typeof rpc.api.generation.me>,
  ) => ["generation-session-list", params] as const,
  generationSession: (id: string) => ["generation-session", id] as const,
  generationSnapshot: (id: string) =>
    ["generation-snapshot", id] as const,
  generationSnapshotStatus: (id: string) =>
    ["generation-snapshot-status", id] as const,
  sharedGenerationSession: (shareId: string) =>
    ["shared-generation-session", shareId] as const,
  loraCatalog: (params?: EdenQuery<typeof rpc.api.generation.loras>) =>
    ["lora-catalog", params] as const,
};
