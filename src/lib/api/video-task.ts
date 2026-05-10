// Shared helpers for upstream new-api task endpoints
// (POST /v1/video/generations, GET /v1/video/generations/:id). Used by
// the chat task pipeline (uppercase TaskStatus vocabulary for the UI)
// and the image generation pipeline (lowercase vocabulary that matches
// our generations.status DB column).
//
// Centralized here because both consumers parse the same upstream
// response shapes and apply the same alias normalization
// ("completed" -> "success", "failed" -> "failure", etc).

export type UpstreamSubmitResp = {
  id?: string;
  task_id?: string;
  status?: string;
};

export type UpstreamFetchResp = {
  task_id?: string;
  status?: string;
  progress?: string;
  // Single-output task (most video models, single-image comfyui).
  result_url?: string;
  // Multi-output task (ComfyUI batch_size>1). When set the poll handler
  // walks every entry and writes one generation_images row per image.
  result_urls?: string[];
  fail_reason?: string;
};

/** Normalize new-api's status aliases into a canonical lowercase form.
 *  Returns one of: pending | submitted | queued | in_progress | success
 *  | failure | unknown. Callers that need uppercase (chat TaskStatus)
 *  should uppercase the result. */
export function normalizeTaskStatus(raw: string | undefined): string {
  if (!raw) return "submitted";
  const lower = raw.toLowerCase();
  if (lower === "completed") return "success";
  if (lower === "failed" || lower === "error") return "failure";
  if (lower === "not_start") return "submitted";
  return lower;
}

/** True when the status is terminal (no further state transitions). */
export function isTerminalTaskStatus(status: string | undefined): boolean {
  if (!status) return false;
  const lower = status.toLowerCase();
  return lower === "success" || lower === "failure";
}

/** Unwrap the optional `data` envelope new-api wraps task responses in.
 *  Some routes return `{ data: {...} }`, others return the payload
 *  directly. Returns null when raw isn't a usable object. */
export function unwrapTaskData<T extends object>(raw: unknown): T | null {
  if (!raw || typeof raw !== "object") return null;
  if ("data" in raw && raw.data && typeof raw.data === "object") {
    return raw.data as T;
  }
  return raw as T;
}
