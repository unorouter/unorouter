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

// Raw SVG strings for the Satori badge renderer ONLY. These statically pull
// ~30 thesvg modules (all variants each); keeping them out of
// vendor-icons.ts keeps them out of the client bundle.

function pickVariant(v: Record<string, string>): string {
  return (v.mono ?? v.light ?? v.default)
    .replace(/fill="[^"]*"/g, "")
    .replace(/fill:[^;"}]+(;|(?=["}]))/g, "");
}

function pickColorVariant(v: Record<string, string>): string {
  return v.color ?? v.default ?? v.light ?? v.mono;
}

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
