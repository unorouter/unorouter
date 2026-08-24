const PREFIX = "custom:::";
const SEP = ":::";

export class ModelListError extends Error {
  status?: number;
  notJson?: boolean;
}

export function isCustomModelId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(PREFIX);
}

export function makeCustomModelId(
  providerId: string,
  modelKey: string,
): string {
  return `${PREFIX}${providerId}${SEP}${modelKey}`;
}

export function parseCustomModelId(
  id: string,
): { providerId: string; modelKey: string } | null {
  if (!isCustomModelId(id)) return null;
  const rest = id.slice(PREFIX.length);
  const sepIdx = rest.indexOf(SEP);
  if (sepIdx === -1) return null;
  const providerId = rest.slice(0, sepIdx);
  const modelKey = rest.slice(sepIdx + SEP.length);
  if (!providerId || !modelKey) return null;
  return { providerId, modelKey };
}

export function normalizeBaseUrl(url: string): string {
  let out = url.trim().replace(/\/+$/, "");
  out = out.replace(/\/chat\/completions$/, "");
  out = out.replace(/\/models$/, "");
  return out;
}

export async function fetchCustomProviderModels(
  baseUrl: string,
  apiKey: string,
  proxy = false,
): Promise<string[]> {
  const base = normalizeBaseUrl(baseUrl);
  const key = apiKey.trim().replace(/^Bearer\s+/i, "");
  // Proxy toggle: providers without CORS cannot answer the browser directly,
  // so the request detours through our custom-forward route.
  const url = proxy ? "/api/ai/chat/custom-forward/models" : `${base}/models`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      ...(proxy ? { "x-proxy-target": base } : {}),
    },
  });
  if (!res.ok) {
    const err = new ModelListError(`Model list request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  // A bot-protection page answers 200 with HTML. Parsing that as JSON throws a
  // syntax error that reads like a bug in us, so name what actually happened.
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    const err = new ModelListError("Model list response was not JSON");
    err.notJson = true;
    throw err;
  }
  const data = (await res.json()) as { data?: Array<{ id?: string }> };
  return (data.data ?? [])
    .map((m) => m.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .sort();
}
