// Single home for per-vendor branding. Adding a vendor: add the Vendor enum
// member, then ONE theme entry + ONE icon loader here (custom SVGs go in
// components/elements/brand/). Badge SVG maps stay server-side in
// server/ops/badge/lib/vendor-svgs.ts so they never enter client chunks.
import type { ComponentType } from "react";

import { Vendor } from "@/lib/types/enums";

export type VendorTheme = {
  bg: string;
  border: string;
  text: string;
  tagBg: string;
  tagBorder: string;
  primary?: string;
};

// The class names are built here, so globals.css lists them in @source inline().
function theme(
  color: string,
  primary: string,
  opts: { shade?: number; text?: string } = {},
): VendorTheme {
  const c = `${color}-${opts.shade ?? 500}`;
  return {
    bg: `bg-${c}/5`,
    border: `border-${c}/20`,
    text: opts.text ?? `text-${color}-700 dark:text-${color}-300`,
    tagBg: `bg-${c}/10`,
    tagBorder: `border-${c}/20`,
    primary,
  };
}

const VENDOR_THEMES: Record<string, VendorTheme> = {
  [Vendor.OPENAI]: theme("green", "#10a37f"),
  [Vendor.ANTHROPIC]: theme("orange", "#d97757"),
  [Vendor.ARCEE]: theme("teal", "#008c8c"),
  [Vendor.GOOGLE]: theme("blue", "#4285f4"),
  [Vendor.ALIBABA]: theme("yellow", "#ff9900"),
  [Vendor.BAILIAN]: theme("orange", "#f97316", {
    text: "text-orange-600 dark:text-orange-300",
  }),
  [Vendor.BYTEDANCE]: theme("sky", "#3b82f6"),
  [Vendor.DEEPSEEK]: theme("blue", "#4d6bfe"),
  [Vendor.FLUX]: theme("fuchsia", "#d946ef"),
  [Vendor.KLING]: theme("violet", "#8b5cf6"),
  [Vendor.META]: theme("sky", "#1877f2"),
  [Vendor.MISTRAL]: theme("amber", "#ff7000"),
  [Vendor.COHERE]: theme("rose", "#fb923c"),
  [Vendor.XAI]: theme("zinc", "#1f2937"),
  [Vendor.MOONSHOT]: theme("indigo", "#ec4899"),
  [Vendor.ZHIPU]: theme("cyan", "#06b6d4"),
  [Vendor.STABILITY]: theme("purple", "#a855f7", {
    text: "text-purple-600 dark:text-purple-300",
  }),
  [Vendor.XIAOMI]: theme("orange", "#ff6900"),
  [Vendor.MINIMAX]: theme("violet", "#a855f7"),
  [Vendor.VIDU]: theme("indigo", "#6366f1"),
  [Vendor.NVIDIA]: theme("lime", "#76b900"),
  [Vendor.TENCENT]: theme("blue", "#22c55e"),
  [Vendor.HUNYUAN]: theme("blue", "#3b82f6"),
  [Vendor.BAIDU]: theme("indigo", "#ef4444"),
  [Vendor.QIANFAN]: theme("indigo", "#6366f1"),
  [Vendor.RECURSIVE]: theme("zinc", "#18181b"),
  [Vendor.MINDSHUB]: theme("cyan", "#1a8596", { shade: 600 }),
  [Vendor.PKRD]: theme("violet", "#7327eb", { shade: 600 }),
  [Vendor.UPSTAGE]: theme("violet", "#805cfb"),
  [Vendor.REKA]: theme("rose", "#f43f5e"),
  [Vendor.LIQUID]: theme("slate", "#64748b"),
  [Vendor.CODEIUM]: theme("teal", "#09b6a2"),
  [Vendor.INCLUSIONAI]: theme("blue", "#3b82f6", {
    text: "text-blue-600 dark:text-blue-300",
  }),
  [Vendor.LING]: theme("blue", "#3b82f6", {
    text: "text-blue-600 dark:text-blue-300",
  }),
  [Vendor.GROQ]: theme("orange", "#f55036"),
  [Vendor.SDAIA]: theme("emerald", "#006c35"),
  [Vendor.BAAI]: theme("indigo", "#4f46e5"),
  [Vendor.IBM]: theme("blue", "#1261fe"),
  [Vendor.JETBRAINS]: theme("fuchsia", "#fe315b"),
  [Vendor.SPEAKLEASH]: theme("red", "#dc2626"),
  [Vendor.PLLUM]: theme("rose", "#e11d48"),
  [Vendor.VILLANOVA]: theme("sky", "#0284c7"),
  [Vendor.INCEPTION]: theme("violet", "#7c3aed"),
  [Vendor.KINFRA]: theme("teal", "#0d9488"),
  [Vendor.DEEPREINFORCE]: theme("lime", "#65a30d"),
  [Vendor.MICROSOFT]: theme("sky", "#0078d4"),
  [Vendor.DEEPGRAM]: theme("emerald", "#13ef93"),
  [Vendor.MYSHELL]: theme("violet", "#6c5ce7"),
  [Vendor.LEONARDO]: theme("purple", "#6c2bd9"),
  [Vendor.LYKON]: theme("rose", "#e11d48"),
  [Vendor.THEDRUMMER]: theme("red", "#dc2626"),
  [Vendor.PFNET]: theme("cyan", "#00a0e9"),
  [Vendor.NEXAGI]: theme("indigo", "#6366f1"),
  [Vendor.POOLSIDE]: theme("teal", "#14b8a6"),
  [Vendor.DOTSSTUDIO]: theme("rose", "#ff2442"),
  [Vendor.AMAZON]: theme("orange", "#ff9900"),
  [Vendor.MOONDREAM]: theme("amber", "#f5c542"),
  [Vendor.SLAI]: theme("violet", "#8b5cf6"),
  [Vendor.JINA]: theme("red", "#e9264b"),
  [Vendor.AISINGAPORE]: theme("red", "#ed2939"),
  [Vendor.POLLINATIONS]: theme("pink", "#ec4899"),
  [Vendor.STEPFUN]: theme("blue", "#005bff"),
  [Vendor.KATANEMO]: theme("teal", "#0d9488"),
  [Vendor.NAVYAI]: theme("indigo", "#1e3a8a"),
  [Vendor.ABLITERATION]: theme("rose", "#e11d48"),
  [Vendor.ORCAROUTER]: theme("cyan", "#0891b2"),
  [Vendor.REGOLO]: theme("emerald", "#58e388"),
  [Vendor.SARVAM]: theme("orange", "#ea580c"),
  [Vendor.TYPHOON]: theme("sky", "#0284c7"),
  [Vendor.OPENBMB]: theme("blue", "#315efe"),
  [Vendor.AIHORDE]: theme("rose", "#e11d48"),
  [Vendor.STEALTH]: theme("zinc", "#71717a"),
  [Vendor.RUNWARE]: theme("lime", "#afff9f"),
  [Vendor.TYPESAFE]: theme("pink", "#e653b8"),
  [Vendor.SWISSAI]: theme("red", "#dc2626"),
  [Vendor.HCOMPANY]: theme("violet", "#7c3aed"),
  [Vendor.AIONLABS]: theme("sky", "#0ea5e9"),
  [Vendor.SAO10K]: theme("rose", "#e11d48"),
  [Vendor.STEELSKULL]: theme("slate", "#475569"),
  [Vendor.BRUHZWATER]: theme("cyan", "#0891b2"),
  [Vendor.FALLENMERICK]: theme("purple", "#9333ea"),
  [Vendor.THINKINGMACHINES]: theme("slate", "#334155"),
  [Vendor.APODEX]: theme("blue", "#437dc4"),
  [Vendor.AXON]: theme("orange", "#ff784c"),
  [Vendor.REFLECTION]: theme("green", "#1f4d2b", {
    shade: 700,
    text: "text-green-800 dark:text-green-300",
  }),
  [Vendor.TELEAI]: theme("blue", "#1e5bb8", { shade: 600 }),
  [Vendor.VOLTROPY]: theme("zinc", "#111111", {
    text: "text-zinc-800 dark:text-zinc-200",
  }),
  [Vendor.IFM]: theme("zinc", "#18181b"),
  [Vendor.MEGANOVA]: theme("emerald", "#059669"),
  [Vendor.GRYPHE]: theme("amber", "#d97706"),
  [Vendor.ANTHRACITE]: theme("zinc", "#3f3f46"),
  [Vendor.ALLENAI]: theme("orange", "#f0529c"),
  [Vendor.AI21]: theme("red", "#e6320f"),
  [Vendor.NOUS]: theme("stone", "#57534e"),
  [Vendor.VOIDAI]: theme("violet", "#7c3aed"),
  [Vendor.ZANITY]: theme("pink", "#ec4899"),
  [Vendor.DEEPL]: theme("blue", "#0f2b46"),
  [Vendor.ELEVENLABS]: theme("zinc", "#1a1a1a"),
  [Vendor.SPEECHIFY]: theme("red", "#ef4444"),
  [Vendor.ESSENTIALAI]: theme("teal", "#14b8a6"),
  [Vendor.KUAISHOU]: theme("orange", "#ff6600"),
  [Vendor.INTERNLM]: theme("sky", "#0ea5e9"),
  [Vendor.SENSENOVA]: theme("rose", "#e11d48"),
  [Vendor.VOYAGE]: theme("cyan", "#0891b2"),
  [Vendor.OPENCODE]: theme("slate", "#64748b"),
  [Vendor.VENICE]: theme("red", "#dc2626"),
  [Vendor.AGNES]: theme("violet", "#7c3aed"),
  [Vendor.REQUESTY]: theme("cyan", "#0891b2"),
  [Vendor.ELECTRONHUB]: theme("amber", "#d97706"),
};

export const DEFAULT_THEME: VendorTheme = {
  bg: "bg-muted/30",
  border: "border-border",
  text: "text-muted-foreground",
  tagBg: "bg-secondary",
  tagBorder: "border-border",
  primary: "#94a3b8",
};

// The catalog declares vendor as required but ships rows without it, so this
// takes the widened type rather than throwing on every card that renders one.
export function getVendorTheme(vendor: string | undefined): VendorTheme {
  const normalized = vendor?.toLowerCase();
  if (!normalized) return DEFAULT_THEME;
  for (const [key, theme] of Object.entries(VENDOR_THEMES)) {
    if (normalized.includes(key)) return theme;
  }
  return DEFAULT_THEME;
}

export type IconComponent = ComponentType<{
  size?: number | string;
  className?: string;
}>;

export type IconLoader = () => Promise<{ default: IconComponent }>;

export const VENDOR_LOADERS: Partial<Record<Vendor, IconLoader>> = {
  [Vendor.ALIBABA]: () => import("@lobehub/icons/es/AlibabaCloud"),
  [Vendor.ARCEE]: () => import("@lobehub/icons/es/Arcee"),
  [Vendor.ANTHROPIC]: () => import("@lobehub/icons/es/Anthropic"),
  [Vendor.BAIDU]: () => import("@lobehub/icons/es/Baidu"),
  [Vendor.BAILIAN]: () => import("@lobehub/icons/es/Bailian"),
  [Vendor.BYTEDANCE]: () => import("@lobehub/icons/es/ByteDance"),
  [Vendor.COHERE]: () => import("@lobehub/icons/es/Cohere"),
  [Vendor.DEEPSEEK]: () => import("@lobehub/icons/es/DeepSeek"),
  [Vendor.FLUX]: () => import("@lobehub/icons/es/Flux"),
  [Vendor.GOOGLE]: () => import("@lobehub/icons/es/Google"),
  [Vendor.AMAZON]: () => import("@lobehub/icons/es/Aws"),
  [Vendor.MOONDREAM]: () =>
    import("@/components/elements/brand/moondream-icon"),
  [Vendor.SLAI]: () => import("@/components/elements/brand/slai-icon"),
  [Vendor.GROQ]: () => import("@lobehub/icons/es/Groq"),
  [Vendor.SDAIA]: () => import("@/components/elements/brand/sdaia-icon"),
  [Vendor.BAAI]: () => import("@lobehub/icons/es/BAAI"),
  [Vendor.IBM]: () => import("@lobehub/icons/es/IBM"),
  [Vendor.JETBRAINS]: () =>
    import("@/components/elements/brand/jetbrains-icon"),
  [Vendor.INCEPTION]: () => import("@lobehub/icons/es/Inception"),
  [Vendor.KINFRA]: () => import("@lobehub/icons/es/Tencent"),
  [Vendor.SPEAKLEASH]: () =>
    import("@/components/elements/brand/speakleash-icon"),
  [Vendor.PLLUM]: () => import("@/components/elements/brand/pllum-icon"),
  [Vendor.VILLANOVA]: () =>
    import("@/components/elements/brand/villanova-icon"),
  [Vendor.DEEPREINFORCE]: () =>
    import("@/components/elements/brand/deepreinforce-icon"),
  [Vendor.MICROSOFT]: () => import("@lobehub/icons/es/Microsoft"),
  [Vendor.MYSHELL]: () => import("@lobehub/icons/es/MyShell"),
  [Vendor.DEEPGRAM]: () => import("@/components/elements/brand/deepgram-icon"),
  [Vendor.LEONARDO]: () => import("@/components/elements/brand/leonardo-icon"),
  [Vendor.LYKON]: () => import("@/components/elements/brand/lykon-icon"),
  [Vendor.THEDRUMMER]: () =>
    import("@/components/elements/brand/thedrummer-icon"),
  [Vendor.FALLENMERICK]: () =>
    import("@/components/elements/brand/fallenmerick-icon"),
  [Vendor.PFNET]: () => import("@/components/elements/brand/pfnet-icon"),
  [Vendor.NEXAGI]: () => import("@/components/elements/brand/nexagi-icon"),
  [Vendor.POOLSIDE]: () => import("@/components/elements/brand/poolside-icon"),
  [Vendor.DOTSSTUDIO]: () =>
    import("@/components/elements/brand/dotsstudio-icon"),
  [Vendor.AISINGAPORE]: () =>
    import("@/components/elements/brand/aisingapore-icon"),
  [Vendor.POLLINATIONS]: () => import("@lobehub/icons/es/Pollinations"),
  [Vendor.NAVYAI]: () => import("@/components/elements/brand/navyai-icon"),
  [Vendor.ABLITERATION]: () =>
    import("@/components/elements/brand/abliteration-icon"),
  [Vendor.ORCAROUTER]: () =>
    import("@/components/elements/brand/orcarouter-icon"),
  [Vendor.REGOLO]: () => import("@/components/elements/brand/regolo-icon"),
  [Vendor.SARVAM]: () => import("@/components/elements/brand/sarvam-icon"),
  [Vendor.TYPHOON]: () => import("@/components/elements/brand/typhoon-icon"),
  [Vendor.OPENBMB]: () => import("@/components/elements/brand/openbmb-icon"),
  [Vendor.AIHORDE]: () => import("@/components/elements/brand/aihorde-icon"),
  [Vendor.STEALTH]: () => import("@/components/elements/brand/stealth-icon"),
  [Vendor.RUNWARE]: () => import("@/components/elements/brand/runware-icon"),
  [Vendor.TYPESAFE]: () => import("@/components/elements/brand/typesafe-icon"),
  [Vendor.HCOMPANY]: () => import("@/components/elements/brand/hcompany-icon"),
  [Vendor.AIONLABS]: () => import("@lobehub/icons/es/AionLabs"),
  [Vendor.SAO10K]: () => import("@/components/elements/brand/sao10k-icon"),
  [Vendor.STEELSKULL]: () =>
    import("@/components/elements/brand/steelskull-icon"),
  [Vendor.BRUHZWATER]: () =>
    import("@/components/elements/brand/bruhzwater-icon"),
  [Vendor.THINKINGMACHINES]: () =>
    import("@/components/elements/brand/thinkingmachines-icon"),
  [Vendor.IFM]: () => import("@/components/elements/brand/ifm-icon"),
  [Vendor.RECURSIVE]: () =>
    import("@/components/elements/brand/recursive-icon"),
  [Vendor.MINDSHUB]: () => import("@/components/elements/brand/mindshub-icon"),
  [Vendor.PKRD]: () => import("@/components/elements/brand/pkrd-icon"),
  [Vendor.REFLECTION]: () =>
    import("@/components/elements/brand/reflection-icon"),
  [Vendor.TELEAI]: () => import("@/components/elements/brand/teleai-icon"),
  [Vendor.VOLTROPY]: () => import("@/components/elements/brand/voltropy-icon"),
  [Vendor.AXON]: () => import("@/components/elements/brand/axon-icon"),
  [Vendor.APODEX]: () => import("@/components/elements/brand/apodex-icon"),
  [Vendor.MEGANOVA]: () => import("@/components/elements/brand/meganova-icon"),
  [Vendor.AGNES]: () => import("@/components/elements/brand/agnes-icon"),
  [Vendor.REQUESTY]: () => import("@/components/elements/brand/requesty-icon"),
  [Vendor.ELECTRONHUB]: () =>
    import("@/components/elements/brand/electronhub-icon"),
  [Vendor.AI21]: () => import("@lobehub/icons/es/Ai21"),
  [Vendor.ALLENAI]: () => import("@lobehub/icons/es/Ai2"),
  [Vendor.NOUS]: () => import("@lobehub/icons/es/NousResearch"),
  [Vendor.GRYPHE]: () => import("@/components/elements/brand/gryphe-icon"),
  [Vendor.ANTHRACITE]: () =>
    import("@/components/elements/brand/anthracite-icon"),
  [Vendor.STEPFUN]: () => import("@lobehub/icons/es/Stepfun"),
  [Vendor.HUNYUAN]: () => import("@lobehub/icons/es/Hunyuan"),
  [Vendor.INCLUSIONAI]: () => import("@lobehub/icons/es/AntGroup"),
  [Vendor.JINA]: () => import("@lobehub/icons/es/Jina"),
  [Vendor.KLING]: () => import("@lobehub/icons/es/Kling"),
  [Vendor.LING]: () => import("@lobehub/icons/es/AntGroup"),
  [Vendor.CODEIUM]: () => import("@lobehub/icons/es/Windsurf"),
  [Vendor.LIQUID]: () => import("@lobehub/icons/es/Liquid"),
  [Vendor.UPSTAGE]: () => import("@lobehub/icons/es/Upstage"),
  [Vendor.REKA]: () => import("@lobehub/icons/es/Reka"),
  [Vendor.META]: () => import("@lobehub/icons/es/Meta"),
  [Vendor.MINIMAX]: () => import("@lobehub/icons/es/Minimax"),
  [Vendor.VIDU]: () => import("@lobehub/icons/es/Vidu"),
  [Vendor.MISTRAL]: () => import("@lobehub/icons/es/Mistral"),
  [Vendor.MOONSHOT]: () => import("@lobehub/icons/es/Moonshot"),
  [Vendor.NVIDIA]: () => import("@lobehub/icons/es/Nvidia"),
  [Vendor.OPENAI]: () => import("@lobehub/icons/es/OpenAI"),
  [Vendor.PERPLEXITY]: () => import("@lobehub/icons/es/Perplexity"),
  [Vendor.QIANFAN]: () => import("@lobehub/icons/es/Baidu"),
  [Vendor.STABILITY]: () => import("@lobehub/icons/es/Stability"),
  [Vendor.TENCENT]: () => import("@lobehub/icons/es/Tencent"),
  [Vendor.XAI]: () => import("@lobehub/icons/es/XAI"),
  [Vendor.X_AI]: () => import("@lobehub/icons/es/XAI"),
  [Vendor.XIAOMI]: () => import("@lobehub/icons/es/XiaomiMiMo"),
  [Vendor.ZHIPU]: () => import("@lobehub/icons/es/Zhipu"),
  [Vendor.DEEPL]: () => import("@lobehub/icons/es/DeepL"),
  [Vendor.ELEVENLABS]: () => import("@lobehub/icons/es/ElevenLabs"),
  [Vendor.VOIDAI]: () => import("@/components/elements/brand/voidai-icon"),
  [Vendor.VENICE]: () => import("@lobehub/icons/es/Venice"),
  [Vendor.ZANITY]: () => import("@/components/elements/brand/zanity-icon"),
  [Vendor.SPEECHIFY]: () =>
    import("@/components/elements/brand/speechify-icon"),
  [Vendor.ESSENTIALAI]: () => import("@lobehub/icons/es/EssentialAI"),
  [Vendor.KUAISHOU]: () => import("@lobehub/icons/es/Kwaipilot"),
  [Vendor.INTERNLM]: () => import("@lobehub/icons/es/InternLM"),
  [Vendor.SENSENOVA]: () => import("@lobehub/icons/es/SenseNova"),
  [Vendor.MEITUAN]: () => import("@lobehub/icons/es/LongCat"),
  [Vendor.SWISSAI]: () => import("@/components/elements/brand/swissai-icon"),
  [Vendor.EUROLLM]: () => import("@/components/elements/brand/eurollm-icon"),
  [Vendor.DICTA]: () => import("@/components/elements/brand/dicta-icon"),
  [Vendor.VOYAGE]: () => import("@lobehub/icons/es/Voyage"),
  [Vendor.OPENCODE]: () => import("@lobehub/icons/es/OpenCode"),
};

export const ALIAS_LOADERS: Record<string, IconLoader> = {
  alibabacloud: () => import("@lobehub/icons/es/AlibabaCloud"),
  claude: () => import("@lobehub/icons/es/Claude"),
  doubao: () => import("@lobehub/icons/es/Doubao"),
  gemini: () => import("@lobehub/icons/es/Gemini"),
  nemotron: () => import("@lobehub/icons/es/Nvidia"),
  horde: () => import("@/components/elements/brand/aihorde-icon"),
  openrouter: () => import("@lobehub/icons/es/OpenRouter"),
  ollama: () => import("@lobehub/icons/es/Ollama"),
  "lm studio": () => import("@lobehub/icons/es/LmStudio"),
  chutes: () => import("@lobehub/icons/es/Chutes"),
  featherless: () => import("@lobehub/icons/es/Featherless"),
};
