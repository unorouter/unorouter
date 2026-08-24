export const CODING_TOOL_REFUSAL_PATTERNS = [
  "assist with development",
  "here to assist with development tasks",
  "sensitive, personal, or emotional",
  "i'm here to help with coding",
  "i'm here to help with development",
  "i'm designed to help with development",
  "let me help you with your code",
  "i'm a coding assistant",
  "development tasks, writing, analysis",
  "infrastructure and configuration",
  "falls outside what i can help with",
  "i'm focused on software development",
  "focused on software development and coding",
  "best suited for software development",
  "i'm built to help with software development",
  "i'm built to help with coding",
  "help with software development, coding",
  "what can i help you build",
  "got a tricky bug",
  "got a coding challenge",
  "got any code challenges",
  "i'm here to help with software",
  "i'm here for coding",
  "i'm droid",
  "development workflows, cli commands",
  "here to help with coding, development workflows",
];

export const CODING_TOOL_NAMES = ["kiro", "cascade", "codeium"];

export const SCAM_PAGE_PATTERNS = [
  "token被盗",
  "token被人盗刷",
  "本站token",
  "盗取token",
  "微信jemes",
];

export const VENDOR_PATTERNS = {
  anthropic: ["anthropic", "claude"],
  openai: ["openai", "chatgpt", "gpt-3", "gpt-4", "gpt-5", "o1-", "o3-", "o4-"],
  google: ["google", "deepmind", "gemini"],
  other: [
    "deepseek",
    "qwen",
    "moonshot",
    "kimi",
    "mistral",
    "llama",
    "meta",
    "grok",
    "xai",
    "zhipu",
  ],
} as const;

export type VendorKey = keyof typeof VENDOR_PATTERNS;

export function foreignPatternsExcept(home: VendorKey): string[] {
  const keys: VendorKey[] = Object.keys(VENDOR_PATTERNS).filter(
    (k): k is VendorKey => k in VENDOR_PATTERNS,
  );
  return keys.filter((k) => k !== home).flatMap((k) => [...VENDOR_PATTERNS[k]]);
}

// prettier-ignore
export const CLOUD_HOST_PATTERNS = ["amazon","aws","bedrock","google","vertex","microsoft","azure","foundry"];

export const FAKE_RESPONSE_SIGNATURES = ["claude sonnet (4.0)"];

export const CJK_CHAR = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/g;

export const CJK_LEAK_MIN_CHARS = 4;
