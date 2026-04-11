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
import type { BadgePricing } from "../cache";
import { t } from "../i18n";
import { Brand, Card, Row } from "../lib/primitives";
import { renderBadge } from "../lib/render";
import { themeVars, type Theme, type ThemeColors } from "../lib/theme";
import { FONT_MONO, FONT_SANS, MonoValue } from "../lib/typography";
import {
  cipherMarker,
  processCipherMarkers,
  type CipherTarget,
} from "./cipher";

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

const MAX_ICONS = 14;

function ProviderIcon(props: {
  name: string;
  svg: string;
  modelCount: number;
  c: ThemeColors;
  countMarker: string;
}) {
  const countValue = String(props.modelCount);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        width: 68,
        position: "relative",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img src={svgDataUri(props.svg, props.c.text)} width={28} height={28} />
      {/* Notification badge with model count */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: -4,
          right: 10,
          backgroundColor: props.c.badgeBg,
          borderRadius: 99,
          minWidth: 16,
          height: 16,
          alignItems: "center",
          justifyContent: "center",
          padding: "0 4px",
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            fontWeight: 700,
            color: "#000",
          }}
        >
          <MonoValue value={countValue} c={{ ...props.c, text: props.c.badgeText }} size={9} cipherMarker={props.countMarker} />
        </span>
      </div>
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
  pricing: BadgePricing,
): Promise<string> {
  const c = themeVars(theme);
  const W = 460;
  const H = 280;
  const vendorNames = pricing.vendorNames;
  const providerCount = `${pricing.vendorCount}+`;
  const modelCountValue = `${pricing.modelCount}+`;

  let markerIdx = 1;
  const m1 = cipherMarker(markerIdx++);
  const m2 = cipherMarker(markerIdx++);

  const resolved = vendorNames
    .map((name) => ({
      name,
      svg: getVendorIcon(name),
      models: pricing.vendorModelCounts[name] ?? 0,
    }))
    .filter((p): p is { name: string; svg: string; models: number } => p.svg !== null)
    .slice(0, MAX_ICONS);

  const remaining = vendorNames.length - resolved.length;

  // Assign a cipher marker per provider icon count
  const iconMarkers = resolved.map(() => cipherMarker(markerIdx++));

  const node = (
    <Card
      c={c}
      style={{
        flexDirection: "column",
        padding: 24,
        justifyContent: "space-between",
      }}
    >
      <Row style={{ alignItems: "center", gap: 6 }}>
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: 14,
            fontWeight: 600,
            color: c.text,
          }}
        >
          {t(locale, "BADGE.POWERED_BY")}
        </span>
        <MonoValue value={providerCount} c={c} size={14} cipherMarker={m1} />
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: 14,
            fontWeight: 600,
            color: c.text,
          }}
        >
          {t(locale, "BADGE.PROVIDERS")}
        </span>
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: 14,
            color: c.muted,
          }}
        >
          ·
        </span>
        <MonoValue value={modelCountValue} c={c} size={14} cipherMarker={m2} />
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: 14,
            fontWeight: 600,
            color: c.text,
          }}
        >
          {t(locale, "BADGE.MODELS")}
        </span>
      </Row>
      <Row style={{ flexWrap: "wrap", gap: 12 }}>
        {resolved.map((p, i) => (
          <ProviderIcon
            key={p.name}
            name={p.name}
            svg={p.svg}
            modelCount={p.models}
            c={c}
            countMarker={iconMarkers[i]}
          />
        ))}
        {remaining > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              width: 56,
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
        <Brand c={c} logoSize={16} fontSize={12} gap={6} />
        <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: c.muted }}>
          | {t(locale, "BADGE.UNIFIED_INTELLIGENCE")}
        </span>
      </Row>
    </Card>
  );

  // Build cipher targets
  const targets: CipherTarget[] = [
    { value: providerCount, fontSize: 14, color: c.text, markerColor: m1 },
    { value: modelCountValue, fontSize: 14, color: c.text, markerColor: m2 },
  ];

  for (let i = 0; i < resolved.length; i++) {
    targets.push({
      value: String(resolved[i].models),
      fontSize: 9,
      color: c.badgeText,
      markerColor: iconMarkers[i],
    });
  }

  let svg = await renderBadge(node, W, H);
  svg = await processCipherMarkers(svg, targets);
  return svg;
}
