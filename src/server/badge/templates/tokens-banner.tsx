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
  const dotMarker = svg.match(
    /<rect[^>]*fill="#fe0099"[^>]*x="([\d.]+)"[^>]*y="([\d.]+)"[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"[^>]*\/?>|<rect[^>]*x="([\d.]+)"[^>]*y="([\d.]+)"[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"[^>]*fill="#fe0099"[^>]*\/?>/,
  );
  if (dotMarker) {
    const x = parseFloat(dotMarker[1] ?? dotMarker[5]);
    const y = parseFloat(dotMarker[2] ?? dotMarker[6]);
    const w = parseFloat(dotMarker[3] ?? dotMarker[7]);
    const h = parseFloat(dotMarker[4] ?? dotMarker[8]);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = w / 2;
    const circle = isStaticMode()
      ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.accent}"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.accent}"><animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/></circle>`;
    svg = svg.replace(dotMarker[0], circle);
  }
  svg = await processCipherMarkers(svg, [
    { value: tokenCount, fontSize: 22, color: c.text, markerColor: marker1, loop: true },
  ]);
  return svg;
}
