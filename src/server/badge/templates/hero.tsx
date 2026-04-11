import type { BadgeSize } from "@/lib/validation/badge";
import { Dot, FONT_SANS, MonoValue } from "../elements/typography";
import { cipherMarker } from "../elements/cipher";
import { t } from "../lib/cache";
import { Brand, Card, Row } from "../elements/primitives";
import { renderBadgeTemplate } from "../lib/utils";
import { themeVars } from "../lib/theme";
import type { BadgeCtx, BadgeDimsBase, CipherTarget } from "../lib/types";

interface Dims extends BadgeDimsBase {
  logoSize: number;
  brandFont: number;
  headingSize: number;
  headingSpacing: number;
  metricFont: number;
  tokenFont: number;
  tokenLabelFont: number;
  dotSize: number;
  pulseDotSize: number;
  metricWidth: string;
  showMetrics: boolean;
}

const DIMS: Partial<Record<BadgeSize, Dims>> = {
  xs: {
    W: 280,
    H: 120,
    pad: 14,
    logoSize: 20,
    brandFont: 10,
    headingSize: 14,
    headingSpacing: 1,
    metricFont: 9,
    tokenFont: 10,
    tokenLabelFont: 8,
    dotSize: 3,
    pulseDotSize: 4,
    metricWidth: "45%",
    showMetrics: false,
  },
  sm: {
    W: 360,
    H: 160,
    pad: 20,
    logoSize: 26,
    brandFont: 13,
    headingSize: 18,
    headingSpacing: 2,
    metricFont: 11,
    tokenFont: 12,
    tokenLabelFont: 10,
    dotSize: 4,
    pulseDotSize: 5,
    metricWidth: "45%",
    showMetrics: false,
  },
  md: {
    W: 440,
    H: 230,
    pad: 24,
    logoSize: 32,
    brandFont: 16,
    headingSize: 24,
    headingSpacing: 3,
    metricFont: 12,
    tokenFont: 12,
    tokenLabelFont: 11,
    dotSize: 5,
    pulseDotSize: 6,
    metricWidth: "45%",
    showMetrics: true,
  },
  lg: {
    W: 540,
    H: 280,
    pad: 30,
    logoSize: 40,
    brandFont: 20,
    headingSize: 30,
    headingSpacing: 4,
    metricFont: 14,
    tokenFont: 14,
    tokenLabelFont: 13,
    dotSize: 6,
    pulseDotSize: 7,
    metricWidth: "45%",
    showMetrics: true,
  },
  xl: {
    W: 660,
    H: 350,
    pad: 38,
    logoSize: 50,
    brandFont: 25,
    headingSize: 38,
    headingSpacing: 5,
    metricFont: 17,
    tokenFont: 17,
    tokenLabelFont: 16,
    dotSize: 8,
    pulseDotSize: 9,
    metricWidth: "45%",
    showMetrics: true,
  },
};

export async function generateHero(ctx: BadgeCtx): Promise<string> {
  const c = themeVars(ctx.theme);
  const d = DIMS[ctx.size]!;
  const tokenCount = ctx.stats.tokenUsed.toLocaleString("en-US");
  const modelCount = `${ctx.pricing.modelCount}+`;
  const uptimeValue = "99.9%";

  const m1 = cipherMarker(1);
  const m2 = d.showMetrics ? cipherMarker(2) : "";
  const m3 = d.showMetrics ? cipherMarker(3) : "";

  const node = (
    <Card
      c={c}
      style={{
        flexDirection: "column",
        padding: d.pad,
        justifyContent: "space-between",
      }}
    >
      <Brand c={c} logoSize={d.logoSize} fontSize={d.brandFont} />
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: d.headingSize,
          fontWeight: 800,
          color: c.text,
          letterSpacing: d.headingSpacing,
        }}
      >
        {t(ctx.locale, "BADGE.UNIFIED_INTELLIGENCE").toUpperCase()}.
      </span>

      {d.showMetrics && (
        <Row style={{ flexWrap: "wrap", gap: 8 }}>
          <Row style={{ width: d.metricWidth, alignItems: "center", gap: 4 }}>
            <Dot text="" c={c} dotSize={d.dotSize} fontSize={d.metricFont} />
            <MonoValue
              value={modelCount}
              c={c}
              size={d.metricFont}
              cipherMarker={m2}
            />
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: d.metricFont,
                color: c.text,
              }}
            >
              {t(ctx.locale, "BADGE.MODELS")}
            </span>
          </Row>
          <Row style={{ width: d.metricWidth, alignItems: "center", gap: 4 }}>
            <Dot text="" c={c} dotSize={d.dotSize} fontSize={d.metricFont} />
            <MonoValue
              value={uptimeValue}
              c={c}
              size={d.metricFont}
              cipherMarker={m3}
            />
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: d.metricFont,
                color: c.text,
              }}
            >
              {t(ctx.locale, "BADGE.UPTIME")}
            </span>
          </Row>
          {[
            t(ctx.locale, "BADGE.SMART_ROUTING"),
            t(ctx.locale, "BADGE.LIVE_STATS"),
          ].map((label) => (
            <Row key={label} style={{ width: d.metricWidth }}>
              <Dot
                text={label}
                c={c}
                dotSize={d.dotSize}
                fontSize={d.metricFont}
              />
            </Row>
          ))}
        </Row>
      )}

      <Row style={{ alignItems: "center", gap: 8 }}>
        <MonoValue
          value={tokenCount}
          c={c}
          size={d.tokenFont}
          cipherMarker={m1}
        />
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: d.tokenLabelFont,
            color: c.muted,
          }}
        >
          {t(ctx.locale, "BADGE.TOKENS_SERVED")}
        </span>
        <Row
          style={{
            width: d.pulseDotSize,
            height: d.pulseDotSize,
            borderRadius: "50%",
            backgroundColor: c.pulseDotMarker,
          }}
        />
      </Row>
    </Card>
  );

  const targets: CipherTarget[] = [
    {
      value: tokenCount,
      fontSize: d.tokenFont,
      color: c.text,
      markerColor: m1,
      loop: true,
    },
  ];
  if (d.showMetrics) {
    targets.push({
      value: modelCount,
      fontSize: d.metricFont,
      color: c.text,
      markerColor: m2,
    });
    targets.push({
      value: uptimeValue,
      fontSize: d.metricFont,
      color: c.text,
      markerColor: m3,
    });
  }

  return renderBadgeTemplate({
    node,
    width: d.W,
    height: d.H,
    pulseDot: { markerColor: c.pulseDotMarker, accentColor: c.accent },
    cipherTargets: targets,
    staticMode: ctx.staticMode,
  });
}
