import type { Locale } from "next-intl";
import type { BadgeStats } from "../cache";
import { t } from "../i18n";
import { formatFull } from "../lib/format";
import { Card, Brand, Divider, Row } from "../lib/primitives";
import { renderBadge } from "../lib/render";
import { themeVars, type Theme } from "../lib/theme";
import { Stat } from "../lib/typography";
import { cipherMarker, isStaticMode, processCipherMarkers } from "./cipher";

export async function generateTokensBanner(
  stats: BadgeStats,
  locale: Locale,
  theme: Theme,
  _ref?: string,
): Promise<string> {
  const c = themeVars(theme);
  const W = 580;
  const H = 120;
  const tokenCount = formatFull(stats.tokenUsed);
  const marker1 = cipherMarker(1);

  const node = (
    <Card c={c} style={{ alignItems: "center", padding: "0 24px" }}>
      <Brand c={c} />
      <Divider c={c} />
      <Stat
        value={tokenCount}
        label={t(locale, "BADGE.TOKENS_SERVED")}
        c={c}
        size={22}
        cipherMarker={marker1}
      />
      <Row
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "#fe0099",
          marginLeft: "auto",
        }}
      />
    </Card>
  );

  let svg = await renderBadge(node, W, H);

  // Replace marker dot with animated (SVG) or static (PNG) circle
  const dotMarker = svg.match(/<(?:path|rect)[^>]*fill="#fe0099"[^>]*\/?>/)
    ?? svg.match(/<(?:path|rect)[^>]*>[^<]*fill="#fe0099"[^>]*\/?>/);
  if (dotMarker) {
    const xM = dotMarker[0].match(/\bx="([\d.]+)"/);
    const yM = dotMarker[0].match(/\by="([\d.]+)"/);
    const wM = dotMarker[0].match(/\bwidth="([\d.]+)"/);
    const hM = dotMarker[0].match(/\bheight="([\d.]+)"/);
    if (xM && yM && wM && hM) {
      const cx = parseFloat(xM[1]) + parseFloat(wM[1]) / 2;
      const cy = parseFloat(yM[1]) + parseFloat(hM[1]) / 2;
      const r = parseFloat(wM[1]) / 2;
      const circle = isStaticMode()
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.accent}"/>`
        : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.accent}"><animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/></circle>`;
      svg = svg.replace(dotMarker[0], circle);
    }
  }
  svg = await processCipherMarkers(svg, [
    { value: tokenCount, fontSize: 22, color: c.text, markerColor: marker1, loop: true },
  ]);
  return svg;
}
