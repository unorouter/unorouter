import { Vendor } from "@/lib/types/enums";
import anthropic from "thesvg/anthropic";
import bailian from "thesvg/bailian";
import bytedance from "thesvg/bytedance";
import cohere from "thesvg/cohere";
import deepseek from "thesvg/deepseek";
import flux from "thesvg/flux";
import google from "thesvg/google";
import kling from "thesvg/kling";
import meta from "thesvg/meta";
import mistral from "thesvg/mistral";
import moonshot from "thesvg/moonshot";
import openai from "thesvg/openai";
import stabilityAi from "thesvg/stability-ai";
import xai from "thesvg/xai";
import zhipu from "thesvg/zhipu";

/** Strip all fill declarations so we can control icon color via parent svg fill */
function stripFills(svg: string): string {
  return svg
    .replace(/fill="[^"]*"/g, "")
    .replace(/fill:[^;"}]+(;|(?=["}]))/g, "");
}

function pickVariant(v: Record<string, string>): string {
  return stripFills(v.mono ?? v.light ?? v.default);
}

/** Vendor enum → monochrome SVG string */
const VENDOR_ICONS: Record<Vendor, string> = {
  [Vendor.OPENAI]: pickVariant(openai.variants),
  [Vendor.ANTHROPIC]: pickVariant(anthropic.variants),
  [Vendor.GOOGLE]: pickVariant(google.variants),
  [Vendor.GOOGLE_DEEPMIND]: pickVariant(google.variants),
  [Vendor.META]: pickVariant(meta.variants),
  [Vendor.DEEPSEEK]: pickVariant(deepseek.variants),
  [Vendor.MISTRAL]: pickVariant(mistral.variants),
  [Vendor.MISTRAL_AI]: pickVariant(mistral.variants),
  [Vendor.COHERE]: pickVariant(cohere.variants),
  [Vendor.XAI]: pickVariant(xai.variants),
  [Vendor.X_AI]: pickVariant(xai.variants),
  [Vendor.BAILIAN]: pickVariant(bailian.variants),
  [Vendor.BYTEDANCE]: pickVariant(bytedance.variants),
  [Vendor.FLUX]: pickVariant(flux.variants),
  [Vendor.KLING]: pickVariant(kling.variants),
  [Vendor.MOONSHOT]: pickVariant(moonshot.variants),
  [Vendor.ZHIPU]: pickVariant(zhipu.variants),
  [Vendor.STABILITY]: pickVariant(stabilityAi.variants),
};

export function getVendorIcon(vendor: string): string | null {
  const key = vendor.toLowerCase() as Vendor;
  if (VENDOR_ICONS[key]) return VENDOR_ICONS[key];
  for (const [k, svg] of Object.entries(VENDOR_ICONS)) {
    if (key.includes(k)) return svg;
  }
  return null;
}

export function svgDataUri(svg: string, color: string): string {
  const colored = svg.replace("<svg ", `<svg fill="${color}" `);
  const b64 = Buffer.from(colored).toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}
