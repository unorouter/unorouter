import { Vendor } from "@/lib/types/enums";
import type { Locale } from "next-intl";
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
import { t } from "../i18n";
import {
  renderBadge,
  themeVars,
  type Theme,
  type ThemeColors,
} from "../satori";
import { BrandName, Card, FONT_SANS, Row } from "./components";

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

const MAX_ICONS = 7;

function ProviderIcon(props: {
  name: string;
  svg: string;
  c: ThemeColors;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        width: 64,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img src={svgDataUri(props.svg, props.c.muted)} width={28} height={28} />
      <span
        style={{ fontFamily: FONT_SANS, fontSize: 8, color: props.c.muted }}
      >
        {props.name}
      </span>
    </div>
  );
}

export async function generateProviders(
  locale: Locale,
  theme: Theme,
  vendorNames: string[],
): Promise<string> {
  const c = themeVars(theme);
  const W = 420;
  const H = 200;

  const resolved = vendorNames
    .map((name) => ({ name, svg: getVendorIcon(name) }))
    .filter((p): p is { name: string; svg: string } => p.svg !== null)
    .slice(0, MAX_ICONS);

  const remaining = vendorNames.length - resolved.length;

  const node = (
    <Card
      c={c}
      style={{
        flexDirection: "column",
        padding: 24,
        justifyContent: "space-between",
      }}
    >
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: 14,
          fontWeight: 600,
          color: c.text,
        }}
      >
        {t(locale, "BADGE.POWERED_BY")} {vendorNames.length}+{" "}
        {t(locale, "BADGE.PROVIDERS")}
      </span>
      <Row style={{ flexWrap: "wrap", gap: 12 }}>
        {resolved.map((p) => (
          <ProviderIcon key={p.name} name={p.name} svg={p.svg} c={c} />
        ))}
        {remaining > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              width: 64,
            }}
          >
            <Row
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: c.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 12,
                  fontWeight: 600,
                  color: c.muted,
                }}
              >
                +{remaining}
              </span>
            </Row>
            <span
              style={{ fontFamily: FONT_SANS, fontSize: 8, color: c.muted }}
            >
              More
            </span>
          </div>
        )}
      </Row>
      <Row style={{ alignItems: "center", gap: 8 }}>
        <BrandName c={c} size={12} />
        <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: c.muted }}>
          | {t(locale, "BADGE.UNIFIED_INTELLIGENCE")}
        </span>
      </Row>
    </Card>
  );

  return renderBadge(node, W, H);
}
