export type UpstreamSubmitResp = {
  id?: string;
  task_id?: string;
  status?: string;
};

export type UpstreamFetchResp = {
  task_id?: string;
  status?: string;
  progress?: string;
  result_url?: string;
  result_urls?: string[];
  fail_reason?: string;
};

export function normalizeTaskStatus(raw: string | undefined): string {
  if (!raw) return "submitted";
  const lower = raw.toLowerCase();
  if (lower === "completed") return "success";
  if (lower === "failed" || lower === "error") return "failure";
  if (lower === "not_start") return "submitted";
  return lower;
}

export function unwrapTaskData<T extends object>(raw: unknown): T | null {
  if (!raw || typeof raw !== "object") return null;
  if ("data" in raw && raw.data && typeof raw.data === "object") {
    return raw.data as T;
  }
  return raw as T;
}
