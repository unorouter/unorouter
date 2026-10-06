import { rec, recArr } from "@/lib/utils/base";

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

export type CatalogModel = {
  id: string;
  name: string | null;
  contextLength: number | null;
  vision: boolean;
  imageOnly: boolean;
  free: boolean;
};

function strings(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}

// Plain OpenAI lists carry only ids; OpenRouter style lists add the rest.
function toCatalogModel(m: Record<string, unknown>): CatalogModel | null {
  if (typeof m.id !== "string" || !m.id) return null;
  const arch = rec(m.architecture);
  const pricing = rec(m.pricing);
  const output = strings(arch?.output_modalities);
  return {
    id: m.id,
    name: typeof m.name === "string" && m.name ? m.name : null,
    contextLength:
      typeof m.context_length === "number" ? m.context_length : null,
    vision: strings(arch?.input_modalities).includes("image"),
    imageOnly: output.length > 0 && !output.includes("text"),
    free:
      m.id.endsWith(":free") ||
      (pricing?.prompt === "0" && pricing?.completion === "0"),
  };
}

export async function fetchCustomProviderModels(
  baseUrl: string,
  apiKey: string,
  proxy = false,
): Promise<CatalogModel[]> {
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
  const data = rec(await res.json());
  return recArr(data?.data)
    .map(toCatalogModel)
    .filter((m): m is CatalogModel => m !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}
