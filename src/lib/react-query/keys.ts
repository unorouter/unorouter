export const queryKeys = {
  pricing: () => ["pricing"] as const,
  models: () => ["models"] as const,
  stats: {
    tokens: () => ["stats", "tokens"] as const,
  },
  newApi: {
    pricing: () => ["new-api", "pricing"] as const,
  },
};
