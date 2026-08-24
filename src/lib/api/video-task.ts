import { isRecord, rec } from "@/lib/utils/base";

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

// T is the caller's all-optional view of an untyped upstream body, so it cannot
// be proven here; a record is the most that can be established. Every field is
// optional and read with `?.`, which is what keeps the claim harmless.
export function unwrapTaskData<T extends object>(raw: unknown): T | null {
  const body = rec(raw);
  if (!body) return null;
  const inner = rec(body.data);
  return (inner ?? body) as T;
}

// Walks an arbitrary error value (parsed upstream JSON, or the {status, data,
// headers} object customFetch throws on non-2xx) for the first human-readable
// message. Upstream nests these differently per provider, hence the search.
export function digErrorMessage(value: unknown): string | null {
  const stack: unknown[] = [value];
  while (stack.length > 0) {
    const node = stack.pop();
    if (typeof node === "string") {
      const s = node.trim();
      if (s.startsWith("{") || s.startsWith("[")) {
        try {
          const found = digErrorMessage(JSON.parse(s));
          if (found) return found;
        } catch {}
      }
      continue;
    }
    if (!isRecord(node)) continue;
    const obj = node;
    for (const key of ["message", "detail"]) {
      const val = obj[key];
      if (typeof val === "string" && val.trim()) {
        return val.trim();
      }
    }
    for (const key of ["error", "data", "output", "response", "body"]) {
      if (key in obj) stack.push(obj[key]);
    }
  }
  return null;
}
