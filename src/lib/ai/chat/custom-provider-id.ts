// Custom-provider model id namespacing + URL normalization + the optional /models fetch.
// A selected custom model rides chatModelAtom as `custom:::<providerId>:::<modelKey>` so it flows
// through the same dropdown + transport as catalog models; the transport resolves the provider locally.

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

// Splits the namespaced id back into its parts. modelKey may itself contain ":::" (rare), so split on the
// FIRST separator after the prefix only.
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

// Normalize a pasted endpoint to the base the openai-compatible SDK appends `/chat/completions` to.
// The user types the FULL base (e.g. `https://api.x.ai/v1`, `https://text.pollinations.ai/openai`,
// `http://localhost:11434/v1`); we only strip a redundant trailing `/chat/completions` or `/models` and
// trailing slashes. We do NOT force `/v1`: endpoints vary (/v1, /openai, Azure deployment paths, ...).
export function normalizeBaseUrl(url: string): string {
  let out = url.trim().replace(/\/+$/, "");
  out = out.replace(/\/chat\/completions$/, "");
  out = out.replace(/\/models$/, "");
  return out;
}

// Lumiverse-style model discovery: GET {base}/models with the key, return sorted model ids.
// Best-effort; throws on network/HTTP error so the UI can surface it.
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
