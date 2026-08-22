import { msg } from "@/lib/config/constants";
import { serverEnv } from "@/server/env";

// Every source is fetched by uno-import, not here. Some answer this cluster's
// IP with a Cloudflare challenge that only a real browser clears, and none of
// them send a CORS header, so neither the gateway nor the browser can reach
// them directly.
const BASE = serverEnv.unoImportUrl;
const TOKEN = serverEnv.unoImportToken;

export type ImportJob = { jobId: string; status: string };

export type ImportedLorebook = {
  name: string;
  scanDepth?: number;
  entries: Array<Record<string, unknown>>;
};

export type ImportedCard = {
  source: string;
  sourceUrl: string;
  card: { spec: string; data: Record<string, unknown> };
  lorebooks: ImportedLorebook[];
  // Lorebooks the source lists but will not hand over, carried by title so the
  // UI can name what is missing instead of silently importing fewer books.
  skipped: Array<{ title: string; reason: "private" | "not_found" }>;
};

export type ImportStatus = {
  status: "queued" | "running" | "done" | "failed";
  result: ImportedCard | null;
  error: string | null;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
  });
  const body = await res.json();
  // uno-import owns the source list, so its rejection is the one the user sees.
  if (!res.ok) {
    throw new Error(
      (body as { error?: string })?.error === "unsupported source"
        ? msg("ERRORS.CARD_IMPORT_UNSUPPORTED")
        : msg("ERRORS.CARD_IMPORT_FETCH_FAILED"),
    );
  }
  return body as T;
}

export async function submitImport(
  input: string,
  userId: string,
): Promise<ImportJob> {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));
  }
  if (url.protocol !== "https:") {
    throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));
  }
  return call<ImportJob>("/api/jobs", {
    method: "POST",
    body: JSON.stringify({ url: url.href, userId }),
  });
}

export const getImportStatus = (jobId: string) =>
  call<ImportStatus>(`/api/jobs/${encodeURIComponent(jobId)}`);
