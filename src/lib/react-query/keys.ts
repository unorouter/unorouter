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
  cards: () => ["rp-cards"] as const,
  card: (id: string) => ["rp-card", id] as const,

  // Sync (server-mirror state for synced rows)
  syncState: () => ["sync-state"] as const,
  syncBundle: (kind: string, id: string) => ["sync-bundle", kind, id] as const,

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
  playgroundSessionList: (params?: EdenQuery<typeof rpc.api.playground.me>) =>
    ["playground-session-list", params] as const,
  playgroundSession: (id: string) => ["playground-session", id] as const,
  playgroundSnapshot: (id: string) => ["playground-snapshot", id] as const,
  playgroundSnapshotStatus: (id: string) =>
    ["playground-snapshot-status", id] as const,
  loraCatalog: (params?: EdenQuery<typeof rpc.api.playground.loras>) =>
    ["lora-catalog", params] as const,
  embeddingCatalog: (
    params?: EdenQuery<typeof rpc.api.playground.embeddings>,
  ) => ["embedding-catalog", params] as const,
  upscalerCatalog: (params?: EdenQuery<typeof rpc.api.playground.upscalers>) =>
    ["upscaler-catalog", params] as const,
  controlNetCatalog: (
    params?: EdenQuery<typeof rpc.api.playground.controlnets>,
  ) => ["controlnet-catalog", params] as const,
};
