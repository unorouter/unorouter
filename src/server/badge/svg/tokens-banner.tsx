import type { Locale } from "next-intl";
import type { BadgeStats } from "../cache";
import { t } from "../i18n";
import { renderBadge, themeVars, formatFull, type Theme } from "../satori";
import { cipherMarker, processCipherMarkers } from "./cipher";
import { Card, Brand, Stat, Divider, pulseDot } from "./components";

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
    </Card>
  );

  let svg = await renderBadge(node, W, H, pulseDot(W - 24, H / 2, 4, c.accent));
  svg = await processCipherMarkers(svg, [
    { value: tokenCount, fontSize: 22, color: c.text, markerColor: marker1, loop: true },
  ]);
  return svg;
}
