// Per-model tokenizers for budget estimation (history fit + lorebook budget). Lumiverse-style: tokenizer
// FILES are not bundled. Built-in presets map to a loader (gpt-tokenizer for the GPT tiktoken families, a
// prebuilt @lenml package for Claude, or an HF slug for everything else); HF tokenizer.json is downloaded ON
// DEMAND and cached in the SQLocal `tokenizers` table (OPFS), so a reload never re-downloads. Users can also
// point a model at any HF slug ("owner/repo") or a direct tokenizer.json URL via `hf:<source>`.
//
// Token counts ONLY drive how much history/lore fits a context window - never billing (new-api bills
// authoritatively) - so any failure (offline, bad slug, unsupported file) falls back to a char/4 estimate
// ("approximate") instead of throwing.
//
// The assembly pipeline counts SYNCHRONOUSLY (history fit, lorebook selection). Loading is async (fetch +
// parse), so the caller PRELOADS the active tokenizer once (`setActiveTokenizer`) before assembly; `countTokens`
// is then sync against the cached active instance. Counts are memoized (cyrb53) since swipe/regen/continue
// re-encode the same surviving history every turn.

import { encode as encodeCl100k } from "gpt-tokenizer";

export type TokenizerKind = "tiktoken" | "huggingface" | "approximate";

// A loaded tokenizer: a sync token counter.
type Encoder = (text: string) => number;

// Built-in preset ids offered in the per-model dropdown. "auto" infers from the model key/name.
// Each non-tiktoken preset resolves to a known HF source (downloaded on demand) or a prebuilt package (claude).
export const TOKENIZER_PRESETS = [
  "auto",
  "cl100k",
  "o200k",
  "claude",
  "llama3",
  "gemma",
  "cohere",
  "deepseek",
  "deepseek-v4",
  "glm4",
  "glm5",
  "qwen",
  "mistral",
] as const;
export type TokenizerPreset = (typeof TOKENIZER_PRESETS)[number];

// A per-model tokenizer selection: a preset id, or `hf:<owner/repo|url>` for a user-supplied HF tokenizer.
export type TokenizerRef = TokenizerPreset | `hf:${string}`;

export const DEFAULT_TOKENIZER: TokenizerPreset = "auto";

// Built-in non-tiktoken presets -> their HF tokenizer source (downloaded on demand, cached in the DB).
// All point at UNGATED repos that serve tokenizer.json without an HF login (the official meta-llama / google /
// CohereForAI repos are license-gated -> 401 -> would fall back to cl100k, so ungated re-uploads are used).
// glm5/glm4 trace to RisuAI's vendored sources (zai-org, MIT). Verified to return 200 at build time.
const PRESET_HF_SOURCE: Partial<Record<TokenizerPreset, string>> = {
  glm5: "zai-org/GLM-5.1",
  glm4: "zai-org/GLM-4.6",
  deepseek: "deepseek-ai/DeepSeek-V3",
  "deepseek-v4": "deepseek-ai/DeepSeek-V3.2-Exp",
  llama3: "NousResearch/Meta-Llama-3-8B",
  gemma: "unsloth/gemma-2-9b",
  qwen: "Qwen/Qwen2.5-7B",
  mistral: "mistralai/Mistral-7B-Instruct-v0.3",
  // command-r is gated by Cohere on every HF mirror -> this 401s and falls back to cl100k. Kept so a user
  // with HF auth (or a future ungated mirror) still resolves it; otherwise the approximate fallback applies.
  cohere: "CohereForAI/c4ai-command-r-v01",
};

// ---- cl100k is always ready (static import) and the universal fallback ----
const CL100K: Encoder = (text) => encodeCl100k(text).length;
// char/4 last-resort estimate when nothing loads (offline + uncached).
const APPROXIMATE: Encoder = (text) => Math.ceil(text.length / 4);

// ---- caches ----
const instanceCache = new Map<string, Encoder>(); // keyed by resolved source
const inflight = new Map<string, Promise<Encoder>>();
instanceCache.set("cl100k", CL100K);

let active: Encoder = CL100K;
// Identity of the active encoder, folded into the count-cache key so switching tokenizers doesn't return a
// stale count cached under a different tokenizer (the dominant bug: same text, different tokenizer).
let activeId = "cl100k";

// ---- count memoization (cyrb53): swipe/regen re-encode the same surviving history every turn ----
const COUNT_CACHE_MAX = 50_000;
const countCache = new Map<string, number>();
function hashText(str: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

// ---- loaders ----
async function loadO200k(): Promise<Encoder> {
  const mod = await import("gpt-tokenizer/encoding/o200k_base");
  return (text) => mod.encode(text).length;
}

async function loadClaude(): Promise<Encoder> {
  const mod = await import("@lenml/tokenizer-claude");
  const tok = mod.fromPreTrained();
  return (text) => tok.encode(text).length;
}

// Build an @lenml tokenizer from already-fetched JSON strings.
async function loadFromJson(
  tokenizerJson: string,
  tokenizerConfig: string | null,
): Promise<Encoder> {
  const { TokenizerLoader } = await import("@lenml/tokenizers");
  // @lenml logs a benign "Unknown tokenizer class ... constructing from base class" warning for tokenizers
  // it doesn't have a named backend for; the base backend still encodes correctly. Mute just that line.
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Unknown tokenizer class")
    )
      return;
    origWarn(...args);
  };
  try {
    const tok = TokenizerLoader.fromPreTrained({
      tokenizerJSON: JSON.parse(tokenizerJson),
      tokenizerConfig: tokenizerConfig ? JSON.parse(tokenizerConfig) : {},
    });
    return (text) => tok.encode(text).length;
  } finally {
    console.warn = origWarn;
  }
}

// Resolve an HF source ("owner/repo" slug or a direct tokenizer.json URL) to the two file URLs.
function hfFileUrls(source: string): { json: string; config: string | null } {
  if (/^https?:\/\//i.test(source)) {
    // A direct tokenizer.json URL: config sits next to it if present.
    return {
      json: source,
      config: source.replace(/tokenizer\.json$/, "tokenizer_config.json"),
    };
  }
  const slug = source.replace(/^hf:/, "");
  const base = `https://huggingface.co/${slug}/resolve/main`;
  return {
    json: `${base}/tokenizer.json`,
    config: `${base}/tokenizer_config.json`,
  };
}

// The DB cache is best-effort: a failure (no OPFS, import throw, quota) must NOT lose the tokenizer - we just
// re-fetch. So cache reads/writes are isolated and never propagate out of loadHuggingFace.
async function readCache(source: string) {
  try {
    const { getTokenizerCache } =
      await import("@/lib/db/client/data/tokenizers");
    return await getTokenizerCache(source);
  } catch {
    return null;
  }
}
async function writeCache(row: {
  source: string;
  name: string;
  tokenizerJson: string;
  tokenizerConfig: string | null;
}) {
  try {
    const { putTokenizerCache } =
      await import("@/lib/db/client/data/tokenizers");
    await putTokenizerCache({ type: "huggingface", ...row });
  } catch {
    /* cache write is best-effort */
  }
}

// Fetch + cache an HF tokenizer into the `tokenizers` table, then build an encoder. DB cache checked first.
async function loadHuggingFace(source: string, name: string): Promise<Encoder> {
  const cached = await readCache(source);
  if (cached?.tokenizerJson) {
    return loadFromJson(cached.tokenizerJson, cached.tokenizerConfig ?? null);
  }
  const urls = hfFileUrls(source);
  const jsonRes = await fetch(urls.json);
  if (!jsonRes.ok)
    throw new Error(`tokenizer fetch failed: ${urls.json} (${jsonRes.status})`);
  const tokenizerJson = await jsonRes.text();
  let tokenizerConfig: string | null = null;
  if (urls.config) {
    const cfgRes = await fetch(urls.config).catch(() => null);
    if (cfgRes?.ok) tokenizerConfig = await cfgRes.text();
  }
  await writeCache({ source, name, tokenizerJson, tokenizerConfig });
  return loadFromJson(tokenizerJson, tokenizerConfig);
}

// Normalize a per-model ref to a canonical cache source + a loader thunk.
function resolveSource(ref: TokenizerRef): {
  source: string;
  name: string;
  load: () => Promise<Encoder>;
} {
  if (ref.startsWith("hf:")) {
    const src = ref.slice(3);
    return { source: src, name: src, load: () => loadHuggingFace(src, src) };
  }
  const preset = ref as TokenizerPreset;
  if (preset === "cl100k" || preset === "auto") {
    return { source: "cl100k", name: "cl100k", load: async () => CL100K };
  }
  if (preset === "o200k") {
    return { source: "o200k", name: "o200k", load: loadO200k };
  }
  if (preset === "claude") {
    return { source: "claude", name: "Claude", load: loadClaude };
  }
  const hf = PRESET_HF_SOURCE[preset];
  if (hf) {
    return {
      source: hf,
      name: preset,
      load: () => loadHuggingFace(hf, preset),
    };
  }
  return { source: "cl100k", name: "cl100k", load: async () => CL100K };
}

// Load (and cache) the encoder for a tokenizer ref. Any failure resolves to the char/4 approximate so
// counting never breaks (offline, bad slug, unsupported file).
export async function loadTokenizer(ref: TokenizerRef): Promise<Encoder> {
  const target = resolveSource(ref);
  const hit = instanceCache.get(target.source);
  if (hit) return hit;
  const pending = inflight.get(target.source);
  if (pending) return pending;

  const job = target
    .load()
    .catch(() => APPROXIMATE)
    .then((enc) => {
      instanceCache.set(target.source, enc);
      inflight.delete(target.source);
      return enc;
    });
  inflight.set(target.source, job);
  return job;
}

// Preload + set the module-active encoder. Call ONCE before assembly so the sync `countTokens` below uses it.
export async function setActiveTokenizer(ref: TokenizerRef): Promise<void> {
  const enc = await loadTokenizer(ref);
  active = enc;
  // Source resolves to the instance-cache key. If the load fell back to APPROXIMATE, the instance under that
  // source IS the approximate encoder, so keying counts by source stays correct.
  activeId = resolveSource(ref).source;
}

// Sync token count against the active (preloaded) tokenizer, memoized by content. Falls back to cl100k until
// a preload resolves.
export function countTokens(text: string | undefined): number {
  if (!text) return 0;
  // Key includes activeId so the SAME text counted under a DIFFERENT tokenizer isn't served a stale count.
  const key = `${activeId} ${text.length} ${hashText(text)}`;
  const hit = countCache.get(key);
  if (hit !== undefined) return hit;
  let value: number;
  try {
    value = active(text);
  } catch {
    value = CL100K(text);
  }
  if (countCache.size >= COUNT_CACHE_MAX) {
    const oldest = countCache.keys().next().value;
    if (oldest !== undefined) countCache.delete(oldest);
  }
  countCache.set(key, value);
  return value;
}

// Reset the active tokenizer to cl100k (between unrelated requests). Cheap; instance cache retained.
export function resetActiveTokenizer(): void {
  active = CL100K;
  activeId = "cl100k";
}

// Map a per-model tokenizer selection ("auto" / preset / hf:slug) to a concrete ref, inferring from the model
// name when "auto". Used by both the custom path (explicit per-model pick) and the default path (always auto).
export function tokenizerRefForModel(
  selection: TokenizerRef | undefined,
  modelName: string | undefined,
): TokenizerRef {
  if (selection && selection !== "auto") return selection;
  return inferTokenizerPreset(modelName);
}

// Infer a preset from a model name. Substring match, most-specific-first. Unknown -> cl100k.
export function inferTokenizerPreset(
  model: string | undefined,
): TokenizerPreset {
  if (!model) return "cl100k";
  const m = model.toLowerCase();
  if (/glm[-_ ]?5/.test(m)) return "glm5";
  if (/glm[-_ ]?4/.test(m) || m.includes("glm")) return "glm4";
  if (/deepseek.*(v4|v3\.2|3\.2)/.test(m)) return "deepseek-v4";
  if (m.includes("deepseek")) return "deepseek";
  if (m.includes("claude")) return "claude";
  if (m.includes("gemma")) return "gemma";
  if (m.includes("command") || m.includes("cohere") || m.includes("aya"))
    return "cohere";
  if (m.includes("qwen")) return "qwen";
  if (m.includes("mistral") || m.includes("mixtral")) return "mistral";
  if (/llama[-_ ]?3/.test(m) || m.includes("llama")) return "llama3";
  if (/gpt-?4o|gpt-?5|chatgpt|o[134][-_ ]|o[134]$/.test(m)) return "o200k";
  return "cl100k";
}
