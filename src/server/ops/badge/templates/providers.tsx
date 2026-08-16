/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { BadgeSize } from "@/lib/validation/badge";
import { FONT_MONO, FONT_SANS, MonoValue } from "../elements/typography";
import { makeCipher } from "../elements/cipher";
import { t } from "../lib/assets";
import { Brand, Card, Row } from "../elements/primitives";
import { renderBadgeTemplate } from "../lib/utils";
import { THEME_COLORS } from "../lib/theme";
import type { BadgeCtx, BadgeDimsBase, ThemeColors } from "../lib/types";
import { getVendorIcon, svgDataUri } from "../lib/utils";

interface Dims extends BadgeDimsBase {
  headerFont: number;
  maxIcons: number;
  iconSize: number;
  slotWidth: number;
  gridGap: number;
  showCountBadge: boolean;
  showTagline: boolean;
  brandLogoSize: number;
  brandFontSize: number;
  countBadgeFont: number;
  countBadgeHeight: number;
}

const DIMS: Partial<Record<BadgeSize, Dims>> = {
  xs: {
    W: 220,
    H: 116,
    pad: 12,
    headerFont: 9,
    maxIcons: 4,
    iconSize: 18,
    slotWidth: 34,
    gridGap: 4,
    showCountBadge: false,
    showTagline: false,
    brandLogoSize: 10,
    brandFontSize: 7,
    countBadgeFont: 8,
    countBadgeHeight: 14,
  },
  sm: {
    W: 310,
    H: 130,
    pad: 14,
    headerFont: 11,
    maxIcons: 6,
    iconSize: 22,
    slotWidth: 36,
    gridGap: 6,
    showCountBadge: false,
    showTagline: false,
    brandLogoSize: 12,
    brandFontSize: 8,
    countBadgeFont: 8,
    countBadgeHeight: 14,
  },
  md: {
    W: 400,
    H: 245,
    pad: 20,
    headerFont: 12,
    maxIcons: 14,
    iconSize: 24,
    slotWidth: 56,
    gridGap: 10,
    showCountBadge: true,
    showTagline: true,
    brandLogoSize: 14,
    brandFontSize: 10,
    countBadgeFont: 8,
    countBadgeHeight: 14,
  },
  lg: {
    W: 500,
    H: 300,
    pad: 24,
    headerFont: 14,
    maxIcons: 14,
    iconSize: 30,
    slotWidth: 68,
    gridGap: 12,
    showCountBadge: true,
    showTagline: true,
    brandLogoSize: 14,
    brandFontSize: 10,
    countBadgeFont: 9,
    countBadgeHeight: 16,
  },
  xl: {
    W: 620,
    H: 370,
    pad: 30,
    headerFont: 17,
    maxIcons: 14,
    iconSize: 38,
    slotWidth: 84,
    gridGap: 14,
    showCountBadge: true,
    showTagline: true,
    brandLogoSize: 14,
    brandFontSize: 10,
    countBadgeFont: 12,
    countBadgeHeight: 20,
  },
  og: {
    W: 1200,
    H: 630,
    pad: 60,
    headerFont: 36,
    maxIcons: 18,
    iconSize: 72,
    slotWidth: 160,
    gridGap: 28,
    showCountBadge: true,
    showTagline: true,
    brandLogoSize: 28,
    brandFontSize: 20,
    countBadgeFont: 22,
    countBadgeHeight: 36,
  },
};

function ProviderIcon(props: {
  name: string;
  svg: string;
  modelCount: number;
  c: ThemeColors;
  countMarker: string;
  iconSize: number;
  slotWidth: number;
  showCountBadge: boolean;
  countBadgeFont: number;
  countBadgeHeight: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        width: props.slotWidth,
        position: "relative",
      }}
    >
      <img
        src={svgDataUri(props.svg, props.c.text)}
        width={props.iconSize}
        height={props.iconSize}
      />
      {props.showCountBadge && (
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -4,
            right: props.slotWidth > 50 ? 10 : 4,
            backgroundColor: props.c.badgeBg,
            borderRadius: 99,
            minWidth: props.countBadgeHeight,
            height: props.countBadgeHeight,
            alignItems: "center",
            justifyContent: "center",
            padding: `0 ${Math.round(props.countBadgeHeight / 4)}px`,
          }}
        >
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: props.countBadgeFont,
              fontWeight: 700,
              color: props.c.badgeText,
            }}
          >
            <MonoValue
              value={String(props.modelCount)}
              c={{ ...props.c, text: props.c.badgeText }}
              size={props.countBadgeFont}
              cipherMarker={props.countMarker}
            />
          </span>
        </div>
      )}
      <span
        style={{ fontFamily: FONT_SANS, fontSize: 7, color: props.c.muted }}
      >
        {props.name}
      </span>
    </div>
  );
}

export async function generateProviders(ctx: BadgeCtx): Promise<string> {
  const c = THEME_COLORS[ctx.theme];
  const d = DIMS[ctx.size]!;
  const providerCount = `${ctx.pricing.vendorCount}+`;
  const modelCountValue = `${ctx.pricing.modelCount}+`;

  const cip = makeCipher();
  const m1 = cip.mark(providerCount, d.headerFont, c.text);
  const m2 = cip.mark(modelCountValue, d.headerFont, c.text);

  const resolved = ctx.pricing.vendorNames
    .map((name) => ({
      name,
      svg: getVendorIcon(name),
      models: ctx.pricing.vendorModelCounts[name] ?? 0,
    }))
    .filter(
      (p): p is { name: string; svg: string; models: number } => p.svg !== null,
    )
    .sort((a, b) => b.models - a.models)
    .slice(0, d.maxIcons);

  const remaining = ctx.pricing.vendorNames.length - resolved.length;
  const iconMarkers = resolved.map((p) =>
    d.showCountBadge
      ? cip.mark(String(p.models), d.countBadgeFont, c.badgeText)
      : "",
  );

  const node = (
    <Card
      c={c}
      style={{
        flexDirection: "column",
        padding: d.pad,
        justifyContent: "space-between",
      }}
    >
      <Row style={{ alignItems: "center", gap: 6 }}>
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: d.headerFont,
            fontWeight: 600,
            color: c.text,
          }}
        >
          {t(ctx.locale, "BADGE.POWERED_BY")}
        </span>
        <MonoValue
          value={providerCount}
          c={c}
          size={d.headerFont}
          cipherMarker={m1}
        />
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: d.headerFont,
            fontWeight: 600,
            color: c.text,
          }}
        >
          {t(ctx.locale, "BADGE.PROVIDERS")}
        </span>
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: d.headerFont,
            color: c.muted,
          }}
        >
          ·
        </span>
        <MonoValue
          value={modelCountValue}
          c={c}
          size={d.headerFont}
          cipherMarker={m2}
        />
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: d.headerFont,
            fontWeight: 600,
            color: c.text,
          }}
        >
          {t(ctx.locale, "BADGE.MODELS")}
        </span>
      </Row>
      <Row style={{ flexWrap: "wrap", gap: d.gridGap }}>
        {resolved.map((p, i) => (
          <ProviderIcon
            key={p.name}
            name={p.name}
            svg={p.svg}
            modelCount={p.models}
            c={c}
            countMarker={iconMarkers[i]}
            iconSize={d.iconSize}
            slotWidth={d.slotWidth}
            showCountBadge={d.showCountBadge}
            countBadgeFont={d.countBadgeFont}
            countBadgeHeight={d.countBadgeHeight}
          />
        ))}
        {remaining > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              width: d.slotWidth - 8,
            }}
          >
            <Row
              style={{
                width: d.iconSize,
                height: d.iconSize,
                borderRadius: 6,
                backgroundColor: c.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: d.headerFont - 1,
                  fontWeight: 600,
                  color: c.muted,
                }}
              >
                +{remaining}
              </span>
            </Row>
            <span
              style={{ fontFamily: FONT_SANS, fontSize: 7, color: c.muted }}
            >
              {t(ctx.locale, "BADGE.MORE")}
            </span>
          </div>
        )}
      </Row>
      <Row style={{ alignItems: "center", gap: 5 }}>
        <div
          style={{
            display: "flex",
            width: 6,
            height: 6,
            borderRadius: 99,
            backgroundColor: c.pulseDotMarker,
          }}
        />
        <Brand
          c={c}
          logoSize={d.brandLogoSize}
          fontSize={d.brandFontSize}
          gap={5}
        />
        {d.showTagline && (
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: d.brandFontSize,
              color: c.muted,
            }}
          >
            | {t(ctx.locale, "BADGE.UNIFIED_INTELLIGENCE")}
          </span>
        )}
      </Row>
    </Card>
  );

  return renderBadgeTemplate({
    node,
    width: d.W,
    height: d.H,
    cipherTargets: cip.targets,
    pulseDot: { markerColor: c.pulseDotMarker, accentColor: c.accent },
    staticMode: ctx.staticMode,
  });
}
