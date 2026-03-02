export const queryKeys = {
  pricing: () => ["pricing"] as const,
  models: () => ["models"] as const,
  stats: {
    live: () => ["stats", "live"] as const,
    history: () => ["stats", "history"] as const,
  },
  newApi: {
    pricing: () => ["new-api", "pricing"] as const,
    subscriptionPlans: () => ["new-api", "subscription-plans"] as const,
  },
};
