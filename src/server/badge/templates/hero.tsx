import type { Locale } from "next-intl";
import type { BadgeStats, BadgePricing } from "../cache";
import { t } from "../i18n";
import { formatFull } from "../lib/format";
import { Card, Brand, Row } from "../lib/primitives";
import { renderBadge } from "../lib/render";
import { themeVars, type Theme } from "../lib/theme";
import { Dot, MonoValue, FONT_SANS } from "../lib/typography";
import { cipherMarker, processCipherMarkers, pulseDot } from "./cipher";

export async function generateHero(
  stats: BadgeStats,
  locale: Locale,
  theme: Theme,
  pricing: BadgePricing,
  _ref?: string,
): Promise<string> {
  const c = themeVars(theme);
  const tokenCount = formatFull(stats.tokenUsed);
  const tokensLabel = t(locale, "BADGE.TOKENS_SERVED");
  const modelCount = `${pricing.modelCount}+`;
  const uptimeValue = "99.9%";
  const W = 500;
  const H = 260;
  const m1 = cipherMarker(1);
  const m2 = cipherMarker(2);
  const m3 = cipherMarker(3);

  const node = (
    <Card
      c={c}
      style={{
        flexDirection: "column",
        padding: 28,
        justifyContent: "space-between",
      }}
    >
      <Brand c={c} logoSize={36} fontSize={18} />
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: 28,
          fontWeight: 800,
          color: c.text,
          letterSpacing: 4,
        }}
      >
        {t(locale, "BADGE.UNIFIED_INTELLIGENCE").toUpperCase()}.
      </span>
      <Row style={{ flexWrap: "wrap", gap: 8 }}>
        <Row style={{ width: "45%", alignItems: "center", gap: 4 }}>
          <Dot text="" c={c} dotSize={6} fontSize={12} />
          <MonoValue value={modelCount} c={c} size={12} cipherMarker={m2} />
          <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: c.text }}>
            {t(locale, "BADGE.MODELS")}
          </span>
        </Row>
        <Row style={{ width: "45%", alignItems: "center", gap: 4 }}>
          <Dot text="" c={c} dotSize={6} fontSize={12} />
          <MonoValue value={uptimeValue} c={c} size={12} cipherMarker={m3} />
          <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: c.text }}>
            {t(locale, "BADGE.UPTIME")}
          </span>
        </Row>
        {[
          t(locale, "BADGE.SMART_ROUTING"),
          t(locale, "BADGE.LIVE_STATS"),
        ].map((label) => (
          <Row key={label} style={{ width: "45%" }}>
            <Dot text={label} c={c} dotSize={6} fontSize={12} />
          </Row>
        ))}
      </Row>
      <Row style={{ alignItems: "center", gap: 8 }}>
        <MonoValue value={tokenCount} c={c} size={14} cipherMarker={m1} />
        <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: c.muted }}>
          {tokensLabel}
        </span>
      </Row>
    </Card>
  );

  let svg = await renderBadge(
    node,
    W,
    H,
    pulseDot(
      28 + tokenCount.length * 8.5 + tokensLabel.length * 6 + 24,
      H - 36,
      3,
      c.accent,
    ),
  );
  svg = await processCipherMarkers(svg, [
    { value: tokenCount, fontSize: 14, color: c.text, markerColor: m1, loop: true },
    { value: modelCount, fontSize: 12, color: c.text, markerColor: m2 },
    { value: uptimeValue, fontSize: 12, color: c.text, markerColor: m3 },
  ]);
  return svg;
}
