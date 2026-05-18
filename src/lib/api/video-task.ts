// Shared helpers for new-api task endpoints.

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
  // ComfyUI batch_size>1: poll handler writes one playground_images row per image.
  result_urls?: string[];
  fail_reason?: string;
};

// Canonical: pending | submitted | queued | in_progress | success | failure
// | unknown. Chat TaskStatus callers must uppercase.
export function normalizeTaskStatus(raw: string | undefined): string {
  if (!raw) return "submitted";
  const lower = raw.toLowerCase();
  if (lower === "completed") return "success";
  if (lower === "failed" || lower === "error") return "failure";
  if (lower === "not_start") return "submitted";
  return lower;
}

// Some routes return `{ data: ... }`, others return payload directly.
export function unwrapTaskData<T extends object>(raw: unknown): T | null {
  if (!raw || typeof raw !== "object") return null;
  if ("data" in raw && raw.data && typeof raw.data === "object") {
    return raw.data as T;
  }
  return raw as T;
}
