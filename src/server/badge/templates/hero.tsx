import type { Locale } from "next-intl";
import type { BadgeStats } from "../cache";
import { t } from "../i18n";
import { formatFull } from "../lib/format";
import { Card, Brand, Row } from "../lib/primitives";
import { renderBadge } from "../lib/render";
import { themeVars, type Theme } from "../lib/theme";
import { Dot, MonoValue, FONT_SANS, pulseDot } from "../lib/typography";
import { cipherMarker, processCipherMarkers } from "./cipher";

export async function generateHero(
  stats: BadgeStats,
  locale: Locale,
  theme: Theme,
  _ref?: string,
): Promise<string> {
  const c = themeVars(theme);
  const tokenCount = formatFull(stats.tokenUsed);
  const tokensLabel = t(locale, "BADGE.TOKENS_SERVED");
  const W = 500;
  const H = 260;
  const marker1 = cipherMarker(1);

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
        {[
          `40+ ${t(locale, "BADGE.MODELS")}`,
          `99.9% ${t(locale, "BADGE.UPTIME")}`,
          t(locale, "BADGE.SMART_ROUTING"),
          t(locale, "BADGE.LIVE_STATS"),
        ].map((label) => (
          <Row key={label} style={{ width: "45%" }}>
            <Dot text={label} c={c} dotSize={6} fontSize={12} />
          </Row>
        ))}
      </Row>
      <Row style={{ alignItems: "center", gap: 8 }}>
        <MonoValue value={tokenCount} c={c} size={14} cipherMarker={marker1} />
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
      H - 34,
      3,
      c.accent,
    ),
  );
  svg = await processCipherMarkers(svg, [
    { value: tokenCount, fontSize: 14, color: c.text, markerColor: marker1, loop: true },
  ]);
  return svg;
}
