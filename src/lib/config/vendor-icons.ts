import type { ComponentType } from "react";

import { Vendor } from "@/lib/types/enums";

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
  [Vendor.PFNET]: () => import("@/components/elements/brand/pfnet-icon"),
  [Vendor.NEXAGI]: () => import("@/components/elements/brand/nexagi-icon"),
  [Vendor.POOLSIDE]: () => import("@/components/elements/brand/poolside-icon"),
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
  [Vendor.HCOMPANY]: () => import("@/components/elements/brand/hcompany-icon"),
  [Vendor.AIONLABS]: () => import("@lobehub/icons/es/AionLabs"),
  [Vendor.SAO10K]: () => import("@/components/elements/brand/sao10k-icon"),
  [Vendor.STEELSKULL]: () =>
    import("@/components/elements/brand/steelskull-icon"),
  [Vendor.BRUHZWATER]: () =>
    import("@/components/elements/brand/bruhzwater-icon"),
  [Vendor.FALLENMERICK]: () =>
    import("@/components/elements/brand/fallenmerick-icon"),
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
  [Vendor.LIQUID]: () => import("@lobehub/icons/es/Liquid"),
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
};
