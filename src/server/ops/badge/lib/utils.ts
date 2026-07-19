import {
  VENDOR_COLOR_SVGS,
  VENDOR_SVGS,
} from "@/server/ops/badge/lib/vendor-svgs";
import { Vendor } from "@/lib/types/enums";
import { escapeRegex } from "@/lib/utils/base";
import satori from "satori";
import {
  processCipherMarkers,
  replacePulseDotMarker,
} from "../elements/cipher";
import type { Dims } from "../templates/pricing";
import { fonts, logoDataUri, logoInnerSvg } from "./cache";
import type { RenderTemplateOpts } from "./types";

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

export function getVendorIcon(vendor: string): string | null {
  const key = vendor.toLowerCase() as Vendor;
  if (VENDOR_SVGS[key]) return VENDOR_SVGS[key];
  for (const [k, svg] of Object.entries(VENDOR_SVGS)) {
    if (key.includes(k)) return svg;
  }
  return null;
}

export function getVendorColorIcon(vendor: string): string | null {
  const key = vendor.toLowerCase() as Vendor;
  if (VENDOR_COLOR_SVGS[key]) return VENDOR_COLOR_SVGS[key];
  for (const [k, svg] of Object.entries(VENDOR_COLOR_SVGS)) {
    if (key.includes(k)) return svg;
  }
  return null;
}

export const POPULAR_VENDORS = [
  "openai",
  "anthropic",
  "google",
  "meta",
  "mistral",
  "deepseek",
  "xai",
  "cohere",
  "moonshot",
  "zhipu",
  "alibaba",
  "minimax",
  "bytedance",
  "flux",
  "stability",
  "kling",
  "iflow",
  "vertex",
];

const NEUTRAL_FILLS = ["#000", "#000000", "#fff", "#ffffff"];

export function prepIconSvg(svg: string): string {
  const normalized = svg.replace(
    /(fill[="':\s]+)#ffff(?![0-9a-fA-F])/gi,
    "$1#ffffff",
  );
  const hasGradient = /linearGradient|radialGradient|stop-color/i.test(
    normalized,
  );
  const fills = [
    ...normalized.matchAll(/fill="(#[0-9a-fA-F]{3,8})"/g),
    ...normalized.matchAll(/fill:\s*(#[0-9a-fA-F]{3,8})/g),
  ].map((m) => m[1].toLowerCase());
  const nonNeutralFill = fills.some((f) => !NEUTRAL_FILLS.includes(f));
  if (hasGradient || nonNeutralFill) return normalized;
  return whiten(normalized);
}

function whiten(svg: string): string {
  const recolored = svg
    .replace(/fill="currentColor"/g, `fill="#ffffff"`)
    .replace(/fill="#000(?:000)?"/gi, `fill="#ffffff"`)
    .replace(/fill:\s*currentColor/g, "fill:#ffffff")
    .replace(/fill:\s*#000(?:000)?/gi, "fill:#ffffff");
  const open = recolored.match(/<svg\b[^>]*>/);
  if (!open) return recolored;
  const tag = open[0];
  const next = /\sfill="/.test(tag)
    ? tag.replace(/\sfill="[^"]*"/, ` fill="#ffffff"`)
    : tag.replace(/<svg\b/, `<svg fill="#ffffff"`);
  return recolored.replace(tag, next);
}

export function svgDataUri(svg: string, color?: string): string {
  const source =
    color != null ? svg.replace("<svg ", `<svg fill="${color}" `) : svg;
  return `data:image/svg+xml;base64,${Buffer.from(source).toString("base64")}`;
}

export async function renderBadgeTemplate(
  opts: RenderTemplateOpts,
): Promise<string> {
  let svg = await satori(opts.node, {
    width: opts.width,
    height: opts.height,
    fonts,
  });

  if (opts.svgBackground) {
    svg = svg.replace(/(<svg[^>]*>)/, `$1${opts.svgBackground}`);
  }

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

  svg = inlineLogoImage(svg, opts.staticMode);

  if (opts.staticMode) svg = inlineNestedSvgImages(svg);

  return svg;
}

function inlineNestedSvgImages(svg: string): string {
  let n = 0;
  return svg.replace(
    /<image\b([^>]*?)href="data:image\/svg\+xml;base64,([^"]+)"([^>]*?)\/?>/g,
    (whole, before: string, b64: string, after: string) => {
      const attrs = `${before} ${after}`;
      const icon = Buffer.from(b64, "base64").toString("utf-8");
      const open = icon.match(/<svg\b[^>]*>/);
      const vb = icon.match(/viewBox="([\d.\-\s]+)"/);
      if (!open) return whole;
      let vbW: number, vbH: number;
      if (vb) {
        const p = vb[1].trim().split(/\s+/).map(Number);
        vbW = p[2];
        vbH = p[3];
      } else {
        vbW = Number(open[0].match(/\bwidth="([\d.]+)"/)?.[1]);
        vbH = Number(open[0].match(/\bheight="([\d.]+)"/)?.[1]);
      }
      const x = Number(attrs.match(/\bx="([\d.\-]+)"/)?.[1]);
      const y = Number(attrs.match(/\by="([\d.\-]+)"/)?.[1]);
      const w = Number(attrs.match(/\bwidth="([\d.]+)"/)?.[1]);
      const h = Number(attrs.match(/\bheight="([\d.]+)"/)?.[1]);
      if (![vbW, vbH, x, y, w, h].every((v) => Number.isFinite(v)))
        return whole;
      const rootFill = open[0].match(/\sfill="([^"]+)"/)?.[1];
      const inner = namespaceSvgIds(
        icon
          .slice(open[0].length)
          .replace(/<\/svg>\s*$/, "")
          .replace(/\bxlink:href=/g, "href="),
        `i${n++}`,
      );
      const matrix = attrs.match(/\btransform="(matrix\([^)]*\))"/)?.[1] ?? "";
      const sx = w / vbW;
      const sy = h / vbH;
      const tf =
        `${matrix} translate(${x},${y}) scale(${sx.toFixed(5)},${sy.toFixed(5)})`.trim();
      const gAttrs =
        `transform="${tf}"` + (rootFill ? ` fill="${rootFill}"` : "");
      return `<g ${gAttrs}>${inner}</g>`;
    },
  );
}

function namespaceSvgIds(svg: string, ns: string): string {
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  let out = svg;
  for (const id of ids) {
    const esc = escapeRegex(id);
    out = out
      .replace(new RegExp(`\\bid="${esc}"`, "g"), `id="${id}_${ns}"`)
      .replace(new RegExp(`url\\(#${esc}\\)`, "g"), `url(#${id}_${ns})`)
      .replace(
        new RegExp(`(\\b(?:xlink:)?href)="#${esc}"`, "g"),
        `$1="#${id}_${ns}"`,
      );
  }
  return out;
}

const LOGO_VIEWBOX = 250;

function inlineLogoImage(svg: string, staticMode?: boolean): string {
  const href = logoDataUri;
  const re = new RegExp(
    `<image\\s+([^>]*?)href="${escapeRegex(href)}"([^>]*?)/?>`,
  );
  return svg.replace(re, (_, before: string, after: string) => {
    const attrs = `${before} ${after}`;
    const xMatch = attrs.match(/\bx="([\d.]+)"/);
    const yMatch = attrs.match(/\by="([\d.]+)"/);
    const wMatch = attrs.match(/\bwidth="([\d.]+)"/);
    const hMatch = attrs.match(/\bheight="([\d.]+)"/);
    if (!xMatch || !yMatch || !wMatch || !hMatch) return _;
    const x = parseFloat(xMatch[1]);
    const y = parseFloat(yMatch[1]);
    const w = parseFloat(wMatch[1]);
    const h = parseFloat(hMatch[1]);
    const sx = w / LOGO_VIEWBOX;
    const sy = h / LOGO_VIEWBOX;
    let inner = logoInnerSvg;
    if (staticMode) {
      inner = inner.replace(/<animateTransform[^>]*\/>/g, "");
    }
    return `<g transform="translate(${x},${y}) scale(${sx},${sy})">${inner}</g>`;
  });
}
