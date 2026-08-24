export type TokenizerKind = "tiktoken" | "huggingface" | "approximate";

type Encoder = (text: string) => number;

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

export type TokenizerRef = TokenizerPreset | `hf:${string}`;

export function isTokenizerRef(v: unknown): v is TokenizerRef {
  if (typeof v !== "string") return false;
  return v.startsWith("hf:") || TOKENIZER_PRESETS.some((p) => p === v);
}

export const DEFAULT_TOKENIZER: TokenizerPreset = "auto";

const PRESET_HF_SOURCE: Partial<Record<TokenizerPreset, string>> = {
  glm5: "zai-org/GLM-5.1",
  glm4: "zai-org/GLM-4.6",
  deepseek: "deepseek-ai/DeepSeek-V3",
  "deepseek-v4": "deepseek-ai/DeepSeek-V3.2-Exp",
  llama3: "NousResearch/Meta-Llama-3-8B",
  gemma: "unsloth/gemma-2-9b",
  qwen: "Qwen/Qwen2.5-7B",
  mistral: "mistralai/Mistral-7B-Instruct-v0.3",
  cohere: "CohereForAI/c4ai-command-r-v01",
};

const APPROXIMATE: Encoder = (text) => Math.ceil(text.length / 4);

const instanceCache = new Map<string, Encoder>(); // keyed by resolved source
const inflight = new Map<string, Promise<Encoder>>();
const degraded = new Set<string>(); // sources whose load failed into APPROXIMATE

// cl100k is lazy too: gpt-tokenizer embeds ~2MB of BPE rank data, which a
// static import put into the chat entry chunk (983KB brotli). Counts are
// approximate until the preload in prepareChatRequest resolves.
let active: Encoder = APPROXIMATE;
let activeId = "approximate";

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

async function loadCl100k(): Promise<Encoder> {
  const mod = await import("gpt-tokenizer/encoding/cl100k_base");
  return (text) => mod.encode(text).length;
}

async function loadO200k(): Promise<Encoder> {
  const mod = await import("gpt-tokenizer/encoding/o200k_base");
  return (text) => mod.encode(text).length;
}

async function loadClaude(): Promise<Encoder> {
  const mod = await import("@lenml/tokenizer-claude");
  const tok = mod.fromPreTrained();
  return (text) => tok.encode(text).length;
}

async function loadFromJson(
  tokenizerJson: string,
  tokenizerConfig: string | null,
): Promise<Encoder> {
  const { TokenizerLoader } = await import("@lenml/tokenizers");
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

function hfFileUrls(source: string): { json: string; config: string | null } {
  if (/^https?:\/\//i.test(source)) {
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

async function readCache(source: string) {
  try {
    const { getTokenizerCache } =
      await import("@/lib/db/client/data/media/tokenizers");
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
      await import("@/lib/db/client/data/media/tokenizers");
    await putTokenizerCache({ type: "huggingface", ...row });
  } catch {}
}

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

function isHfRef(ref: TokenizerRef): ref is `hf:${string}` {
  return ref.startsWith("hf:");
}

function resolveSource(ref: TokenizerRef): {
  source: string;
  name: string;
  load: () => Promise<Encoder>;
} {
  if (isHfRef(ref)) {
    const src = ref.slice(3);
    return { source: src, name: src, load: () => loadHuggingFace(src, src) };
  }
  const preset = ref;
  if (preset === "cl100k" || preset === "auto") {
    return { source: "cl100k", name: "cl100k", load: loadCl100k };
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
  return { source: "cl100k", name: "cl100k", load: loadCl100k };
}

export async function loadTokenizer(ref: TokenizerRef): Promise<Encoder> {
  const target = resolveSource(ref);
  const hit = instanceCache.get(target.source);
  if (hit) return hit;
  const pending = inflight.get(target.source);
  if (pending) return pending;

  const job = target
    .load()
    .catch(() => {
      // A failed load still counts, just at ~4 chars per token. Silent before,
      // which let a debug export name a tokenizer that was never running.
      degraded.add(target.source);
      return APPROXIMATE;
    })
    .then((enc) => {
      instanceCache.set(target.source, enc);
      inflight.delete(target.source);
      return enc;
    });
  inflight.set(target.source, job);
  return job;
}

export async function setActiveTokenizer(ref: TokenizerRef): Promise<void> {
  const enc = await loadTokenizer(ref);
  active = enc;
  activeId = resolveSource(ref).source;
}

/** What is actually counting, which is not always what was asked for. */
export function activeTokenizerState(): {
  source: string;
  exact: boolean;
  used: boolean;
} {
  // activeId only leaves its default once a request has resolved one, so a
  // report taken on a fresh page describes nothing that ran.
  const used = activeId !== "approximate";
  return { source: activeId, exact: used && !degraded.has(activeId), used };
}

export function countTokens(text: string | undefined): number {
  if (!text) return 0;
  const key = `${activeId} ${text.length} ${hashText(text)}`;
  const hit = countCache.get(key);
  if (hit !== undefined) return hit;
  let value: number;
  try {
    value = active(text);
  } catch {
    value = APPROXIMATE(text);
  }
  if (countCache.size >= COUNT_CACHE_MAX) {
    const oldest = countCache.keys().next().value;
    if (oldest !== undefined) countCache.delete(oldest);
  }
  countCache.set(key, value);
  return value;
}

export function tokenizerRefForModel(
  selection: TokenizerRef | undefined,
  modelName: string | undefined,
): TokenizerRef {
  if (selection && selection !== "auto") return selection;
  return inferTokenizerPreset(modelName);
}

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
