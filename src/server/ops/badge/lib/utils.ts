import { VENDOR_SVGS } from "@/lib/config/vendor-icons";
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

  return svg;
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
