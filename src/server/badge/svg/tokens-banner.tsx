import type { Locale } from "next-intl";
import type { BadgeStats } from "../cache";
import { t } from "../i18n";
import { renderBadge, themeVars, formatCompact, type Theme } from "../satori";
import { Card, Brand, Stat, Divider, pulseDot } from "./components";

export async function generateTokensBanner(
  stats: BadgeStats,
  locale: Locale,
  theme: Theme,
  _ref?: string,
): Promise<string> {
  const c = themeVars(theme);
  const W = 480;
  const H = 120;

  const node = (
    <Card c={c} style={{ alignItems: "center", padding: "0 24px" }}>
      <Brand c={c} />
      <Divider c={c} />
      <Stat
        value={formatCompact(stats.tokenUsed)}
        label={t(locale, "BADGE.TOKENS_SERVED")}
        c={c}
      />
    </Card>
  );

  return renderBadge(node, W, H, pulseDot(W - 24, H / 2, 4, c.accent));
}
