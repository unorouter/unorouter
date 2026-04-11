import { t } from "../i18n";
import { HERO_DIMS, resolveDims } from "../lib/config";
import { formatFull } from "../lib/format";
import { Brand, Card, Row } from "../lib/primitives";
import { renderBadge } from "../lib/render";
import { themeVars } from "../lib/theme";
import { Dot, FONT_SANS, MonoValue } from "../lib/typography";
import type { BadgeCtx } from "../route";
import {
  cipherMarker,
  processCipherMarkers,
  replacePulseDotMarker,
  type CipherTarget,
} from "./cipher";

export async function generateHero(ctx: BadgeCtx): Promise<string> {
  const c = themeVars(ctx.theme);
  const d = resolveDims(HERO_DIMS, ctx.size);
  const tokenCount = formatFull(ctx.stats.tokenUsed);
  const tokensLabel = t(ctx.locale, "BADGE.TOKENS_SERVED");
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
          {tokensLabel}
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

  let svg = await renderBadge(node, d.W, d.H);
  svg = replacePulseDotMarker(svg, c.pulseDotMarker, c.accent);

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

  svg = await processCipherMarkers(svg, targets);
  return svg;
}
