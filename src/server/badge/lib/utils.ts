import { Vendor } from "@/lib/types/enums";
import satori from "satori";
import {
  processCipherMarkers,
  replacePulseDotMarker,
} from "../elements/cipher";
import { fonts } from "./cache";
import type { RenderTemplateOpts } from "./types";
import aihubmix from "thesvg/aihubmix";
import alibaba from "thesvg/alibaba";
import anthropic from "thesvg/anthropic";
import bailian from "thesvg/bailian";
import bytedance from "thesvg/bytedance";
import cohere from "thesvg/cohere";
import deepseek from "thesvg/deepseek";
import flux from "thesvg/flux";
import google from "thesvg/google";
import iflow from "thesvg/iflow";
import iflytekcloud from "thesvg/iflytekcloud";
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
import zhipu from "thesvg/zhipu";
import type { Dims } from "../templates/pricing";

export function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function discount(original: number, current: number): string {
  if (original <= 0) return "";
  const pct = Math.round((1 - current / original) * 100);
  return pct > 0 ? `-${pct}%` : "";
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


export function computeSize(
  d: Dims,
  rowCount: number,
): { W: number; H: number } {
  const cols =
    d.modelWidth +
    d.iconSize +
    6 +
    d.priceWidth * 2 +
    (d.showOriginal ? d.discountWidth : 0);
  const W = cols + d.pad * 2;
  const headerH = Math.max(d.headerLogoSize, d.headerFont) + 10;
  const tableHeaderH = d.labelFont + 20;
  const footerH = d.showOriginal ? d.noteFont + 14 : 0;
  const H =
    d.pad * 2 + headerH + tableHeaderH + rowCount * d.rowHeight + footerH;
  return { W, H };
}

function pickVariant(v: Record<string, string>): string {
  return (v.mono ?? v.light ?? v.default)
    .replace(/fill="[^"]*"/g, "")
    .replace(/fill:[^;"}]+(;|(?=["}]))/g, "");
}

const VENDOR_ICONS: Partial<Record<Vendor, string>> = {
  [Vendor.OPENAI]: pickVariant(openai.variants),
  [Vendor.ANTHROPIC]: pickVariant(anthropic.variants),
  [Vendor.GOOGLE]: pickVariant(google.variants),
  [Vendor.GOOGLE_DEEPMIND]: pickVariant(google.variants),
  [Vendor.META]: pickVariant(meta.variants),
  [Vendor.MINIMAX]: pickVariant(minimax.variants),
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
  [Vendor.ZHIPU_CN]: pickVariant(zhipu.variants),
  [Vendor.ZHIPU_AI_CODING]: pickVariant(zhipu.variants),
  [Vendor.STABILITY]: pickVariant(stabilityAi.variants),
  [Vendor.STABILITY_AI]: pickVariant(stabilityAi.variants),
  [Vendor.ALIBABA]: pickVariant(alibaba.variants),
  [Vendor.IFLOW]: pickVariant(iflow.variants),
  [Vendor.KUAISHOU]: pickVariant(kuaishou.variants),
  [Vendor.SAP]: pickVariant(sap.variants),
  [Vendor.VERTEX]: pickVariant(vertexai.variants),
  [Vendor.AIHUBMIX]: pickVariant(aihubmix.variants),
  [Vendor.OPENCODE]: pickVariant(opencode.variants),
  [Vendor.XUNFEI]: pickVariant(iflytekcloud.variants),
  [Vendor.XUNFEI_CN]: pickVariant(iflytekcloud.variants),
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

export async function renderBadgeTemplate(
  opts: RenderTemplateOpts,
): Promise<string> {
  let svg = await satori(opts.node, {
    width: opts.width,
    height: opts.height,
    fonts,
  });

  if (opts.smil) {
    svg = svg.replace("</svg>", `${opts.smil}</svg>`);
  }

  if (opts.pulseDot) {
    svg = replacePulseDotMarker(
      svg,
      opts.pulseDot.markerColor,
      opts.pulseDot.accentColor,
      opts.staticMode,
    );
  }

  if (opts.cipherTargets && opts.cipherTargets.length > 0) {
    svg = await processCipherMarkers(svg, opts.cipherTargets, opts.staticMode);
  }

  return svg;
}
