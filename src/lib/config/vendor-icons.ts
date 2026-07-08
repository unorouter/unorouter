import type { ComponentType } from "react";

import { Vendor } from "@/lib/types/enums";

import aihubmix from "thesvg/aihubmix";
import alibaba from "thesvg/alibaba";
import anthropic from "thesvg/anthropic";
import bailian from "thesvg/bailian";
import bytedance from "thesvg/bytedance";
import cohere from "thesvg/cohere";
import deepseek from "thesvg/deepseek";
import flux from "thesvg/flux";
import google from "thesvg/google";
import groq from "thesvg/groq";
import iflow from "thesvg/iflow";
import iflytekcloud from "thesvg/iflytekcloud";
import jina from "thesvg/jina-ai";
import kling from "thesvg/kling";
import kuaishou from "thesvg/kuaishou";
import meta from "thesvg/meta";
import minimax from "thesvg/minimax";
import mistral from "thesvg/mistral";
import moonshot from "thesvg/moonshot";
import openai from "thesvg/openai";
import opencode from "thesvg/opencode";
import sap from "thesvg/sap";
import stabilityAi from "thesvg/stability-ai";
import vertexai from "thesvg/vertexai-google";
import xai from "thesvg/xai";
import xiaomiMimo from "thesvg/xiaomi-mimo";
import zhipu from "thesvg/zhipu";

export type IconComponent = ComponentType<{
  size?: number | string;
  className?: string;
}>;

export type IconLoader = () => Promise<{ default: IconComponent }>;

function pickVariant(v: Record<string, string>): string {
  return (v.mono ?? v.light ?? v.default)
    .replace(/fill="[^"]*"/g, "")
    .replace(/fill:[^;"}]+(;|(?=["}]))/g, "");
}

function pickColorVariant(v: Record<string, string>): string {
  return v.color ?? v.default ?? v.light ?? v.mono;
}

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

const ARCEE_SVG =
  '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Arcee</title><path d="M13.236 2.377L2.751 20.493H0L11.863 0l1.373 2.377zm3.554 6.156l-9.606 11.96H4.13L15.511 6.32l1.279 2.212zm6.908 11.96H14.05l8.406-2.151 1.242 2.15zm-3.42-5.922l-7.843 5.92H8.482l10.597-7.997 1.2 2.077z"></path></svg>';

export const VENDOR_SVGS: Partial<Record<Vendor, string>> = {
  [Vendor.OPENAI]: pickVariant(openai.variants),
  [Vendor.ARCEE]: ARCEE_SVG,
  [Vendor.ANTHROPIC]: pickVariant(anthropic.variants),
  [Vendor.GOOGLE]: pickVariant(google.variants),
  [Vendor.META]: pickVariant(meta.variants),
  [Vendor.MINIMAX]: pickVariant(minimax.variants),
  [Vendor.DEEPSEEK]: pickVariant(deepseek.variants),
  [Vendor.MISTRAL]: pickVariant(mistral.variants),
  [Vendor.COHERE]: pickVariant(cohere.variants),
  [Vendor.XAI]: pickVariant(xai.variants),
  [Vendor.X_AI]: pickVariant(xai.variants),
  [Vendor.BAILIAN]: pickVariant(bailian.variants),
  [Vendor.BYTEDANCE]: pickVariant(bytedance.variants),
  [Vendor.FLUX]: pickVariant(flux.variants),
  [Vendor.GROQ]: pickVariant(groq.variants),
  [Vendor.JINA]: pickVariant(jina.variants),
  [Vendor.KLING]: pickVariant(kling.variants),
  [Vendor.MOONSHOT]: pickVariant(moonshot.variants),
  [Vendor.ZHIPU]: pickVariant(zhipu.variants),
  [Vendor.ZHIPU_CN]: pickVariant(zhipu.variants),
  [Vendor.ZHIPU_AI_CODING]: pickVariant(zhipu.variants),
  [Vendor.STABILITY]: pickVariant(stabilityAi.variants),
  [Vendor.ALIBABA]: pickVariant(alibaba.variants),
  [Vendor.IFLOW]: pickVariant(iflow.variants),
  [Vendor.KUAISHOU]: pickVariant(kuaishou.variants),
  [Vendor.SAP]: pickVariant(sap.variants),
  [Vendor.VERTEX]: pickVariant(vertexai.variants),
  [Vendor.AIHUBMIX]: pickVariant(aihubmix.variants),
  [Vendor.OPENCODE]: pickVariant(opencode.variants),
  [Vendor.XUNFEI]: pickVariant(iflytekcloud.variants),
  [Vendor.XUNFEI_CN]: pickVariant(iflytekcloud.variants),
  [Vendor.XIAOMI]: pickVariant(xiaomiMimo.variants),
};

export const VENDOR_COLOR_SVGS: Partial<Record<Vendor, string>> = {
  [Vendor.OPENAI]: pickColorVariant(openai.variants),
  [Vendor.ANTHROPIC]: pickColorVariant(anthropic.variants),
  [Vendor.GOOGLE]: pickColorVariant(google.variants),
  [Vendor.META]: pickColorVariant(meta.variants),
  [Vendor.MINIMAX]: pickColorVariant(minimax.variants),
  [Vendor.DEEPSEEK]: pickColorVariant(deepseek.variants),
  [Vendor.MISTRAL]: pickColorVariant(mistral.variants),
  [Vendor.COHERE]: pickColorVariant(cohere.variants),
  [Vendor.XAI]: pickColorVariant(xai.variants),
  [Vendor.X_AI]: pickColorVariant(xai.variants),
  [Vendor.BAILIAN]: pickColorVariant(bailian.variants),
  [Vendor.BYTEDANCE]: pickColorVariant(bytedance.variants),
  [Vendor.FLUX]: pickColorVariant(flux.variants),
  [Vendor.JINA]: pickColorVariant(jina.variants),
  [Vendor.KLING]: pickColorVariant(kling.variants),
  [Vendor.MOONSHOT]: pickColorVariant(moonshot.variants),
  [Vendor.ZHIPU]: pickColorVariant(zhipu.variants),
  [Vendor.STABILITY]: pickColorVariant(stabilityAi.variants),
  [Vendor.ALIBABA]: pickColorVariant(alibaba.variants),
  [Vendor.IFLOW]: pickColorVariant(iflow.variants),
  [Vendor.KUAISHOU]: pickColorVariant(kuaishou.variants),
  [Vendor.VERTEX]: pickColorVariant(vertexai.variants),
  [Vendor.XIAOMI]: pickColorVariant(xiaomiMimo.variants),
};
