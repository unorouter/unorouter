import type { Locale } from "next-intl";
import type { BadgeStats } from "../cache";
import { t } from "../i18n";
import { formatCompact } from "../lib/format";
import { Card, Logo, BrandName } from "../lib/primitives";
import { renderBadge } from "../lib/render";
import { themeVars, type Theme } from "../lib/theme";
import { MonoValue, Label } from "../lib/typography";
import { cipherMarker, processCipherMarkers, pulseDot } from "./cipher";

export async function generateTokensSquare(
  stats: BadgeStats,
  locale: Locale,
  theme: Theme,
  _ref?: string,
): Promise<string> {
  const c = themeVars(theme);
  const W = 200;
  const H = 200;
  const value = formatCompact(stats.tokenUsed);
  const m1 = cipherMarker(1);

  const node = (
    <Card
      c={c}
      radius={16}
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "24px 0",
      }}
    >
      <Logo size={56} />
      <BrandName c={c} size={14} />
      <MonoValue value={value} c={c} size={24} cipherMarker={m1} />
      <Label text={t(locale, "BADGE.TOKENS_SERVED")} c={c} size={10} />
    </Card>
  );

  let svg = await renderBadge(node, W, H, pulseDot(W / 2, H - 22, 3, c.accent));
  svg = await processCipherMarkers(svg, [
    { value, fontSize: 24, color: c.text, markerColor: m1 },
  ]);
  return svg;
}
