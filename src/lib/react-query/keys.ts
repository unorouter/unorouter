import type { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";

export const queryKeys = {
  auth: () => ["auth"] as const,
  status: () => ["status"] as const,
  twoFAStatus: () => ["2fa-status"] as const,
  passkeyStatus: () => ["passkey-status"] as const,

  dashboardQuota: (
    params?: EdenQuery<typeof rpc.api.billing.dashboard.quota>,
  ) => ["dashboard-quota", params] as const,
  dashboardUptime: () => ["dashboard-uptime"] as const,

  tokens: (params?: EdenQuery<typeof rpc.api.billing.token.search>) =>
    ["tokens", params] as const,
  bestKey: () => ["best-key"] as const,
  userGroups: () => ["user-groups"] as const,

  topUpInfo: () => ["topup-info"] as const,
  subscriptionSelf: () => ["subscription-self"] as const,
  billingPlans: () => ["billing-plans"] as const,
  subscriptionPlans: () => ["subscription-plans"] as const,

  topUpHistory: (
    params?: EdenQuery<typeof rpc.api.billing.core.transactions.topups>,
  ) => ["topup-history", params] as const,
  subscriptionOrders: (
    params?: EdenQuery<typeof rpc.api.billing.core.transactions.orders>,
  ) => ["subscription-orders", params] as const,

  affiliateCommissions: (
    params?: EdenQuery<typeof rpc.api.billing.affiliate.commissions>,
  ) => ["affiliate-commissions", params] as const,
  affiliateInvitees: (
    params?: EdenQuery<typeof rpc.api.billing.affiliate.invitees>,
  ) => ["affiliate-invitees", params] as const,

  usageLogs: (params?: EdenQuery<typeof rpc.api.ops.logs>) =>
    ["usage-logs", params] as const,
  usageLogsStat: (params?: EdenQuery<typeof rpc.api.ops.logs.stat>) =>
    ["usage-logs-stat", params] as const,
  midjourneyLogs: (params?: EdenQuery<typeof rpc.api.ops.logs.midjourney>) =>
    ["midjourney-logs", params] as const,
  taskLogs: (params?: EdenQuery<typeof rpc.api.ops.logs.task>) =>
    ["task-logs", params] as const,

  conversations: (keyword?: string) => ["conversations", keyword] as const,
  chatGroups: () => ["chat-groups"] as const,
  chatMeta: (id: string) => ["chat-meta", id] as const,
  chatMessages: (id: string) => ["chat-messages", id] as const,
  chatSettings: (id: string) => ["chat-settings", id] as const,
  chatBindings: (id: string) => ["chat-bindings", id] as const,
  taskStatus: (taskId: string) => ["task-status", taskId] as const,
  queuedSends: () => ["queued-sends"] as const,

  media: (id: string) => ["media", id] as const,
  mediaNone: () => ["media", "none"] as const,

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
  customProviders: () => ["custom-providers"] as const,
  customProvider: (id: string) => ["custom-providers", id] as const,

  imageSessionLists: () => ["image-sessions"] as const,
  imageSessionList: (params?: unknown) => ["image-sessions", params] as const,
  imageSession: (id: string) => ["image-session", id] as const,
  imageSnapshot: (id: string) => ["image-snapshot", id] as const,
  checkpointSearch: (q: string) => ["checkpoint-search", q] as const,
  savedImageModels: () => ["saved-image-models"] as const,
  imagePresets: () => ["image-presets"] as const,
  loraCatalog: (params?: unknown) => ["lora-catalog", params] as const,
  embeddingCatalog: (params?: unknown) =>
    ["embedding-catalog", params] as const,

  requestLog: (msgId: string) => ["request-log", msgId] as const,

  pricing: () => ["pricing"] as const,
  pricingCounts: () => ["pricing", "counts"] as const,
  pricingVendors: () => ["pricing", "vendors"] as const,
  pricingVendor: (name: string) => ["pricing", "vendor", name] as const,
  pricingModel: (name: string) => ["pricing", "model", name] as const,
  searchIndex: (locale: string) => ["search-index", locale] as const,
  searchResults: (locale: string, query: string) =>
    ["search-index", "results", locale, query] as const,
  statsHistory: () => ["stats-history"] as const,

  rankings: (period?: string) => ["rankings", period] as const,

  modelTests: () => ["model-tests"] as const,
  modelTest: (id: string) => ["model-tests", id] as const,
  modelTestHistoryProviders: () => ["model-tests-providers"] as const,
  modelTestHistoryModels: (host: string) =>
    ["model-tests-models", host] as const,
  modelTestHistoryModelTests: (host: string, model: string) =>
    ["model-tests-model-tests", host, model] as const,
  modelTesterRankings: (page: number, pageSize: number) =>
    ["model-tester-rankings", page, pageSize] as const,
  modelTesterStats: () => ["model-tester-stats"] as const,
  modelTesterProviderDetail: (host: string) =>
    ["model-tester-provider", host] as const,
  modelTesterRankingDetail: (host: string, model: string) =>
    ["model-tester-ranking", host, model] as const,
  modelTesterPublishedTest: (id: string) =>
    ["model-tester-published-test", id] as const,

  perfMetricsSummary: (hours: number) =>
    ["perf-metrics", "summary", hours] as const,
  perfMetrics: (modelName: string, hours: number) =>
    ["perf-metrics", modelName, hours] as const,

  benchmarks: (modelName: string) => ["benchmarks", modelName] as const,

  modelRanking: (modelName: string, period: string) =>
    ["model-ranking", modelName, period] as const,

  modelStatusPage: (bucket: string, hours: number) =>
    ["model-status", "page", bucket, hours] as const,
  modelStatusComponents: () => ["model-status", "components"] as const,
  modelStatusBuckets: (model: string, bucket: string, hours: number) =>
    ["model-status", "buckets", model, bucket, hours] as const,
};
