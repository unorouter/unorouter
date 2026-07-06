const PREFIX = "custom:::";
const SEP = ":::";

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
): Promise<string[]> {
  const base = normalizeBaseUrl(baseUrl);
  const key = apiKey.trim().replace(/^Bearer\s+/i, "");
  const res = await fetch(`${base}/models`, {
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
  });
  if (!res.ok) {
    const err = new Error(`Model list request failed (${res.status})`);
    (err as { status?: number }).status = res.status;
    throw err;
  }
  const data = (await res.json()) as { data?: Array<{ id?: string }> };
  return (data.data ?? [])
    .map((m) => m.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .sort();
}
