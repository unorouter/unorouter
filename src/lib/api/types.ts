/** Raw new-api response types */

export type NewApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export type QuotaData = {
  count: number;
  quota: number;
  token_used: number;
  created_at: number;
};

export type LiveStatRaw = {
  quota: number;
  rpm: number;
  tpm: number;
};

export type LiveStatData = {
  quota: number;
  rpm: number;
  tpm: number;
};

export type HistoryStatData = {
  avgTpm: number;
  requestCount: number;
  tokenUsed: number;
};
