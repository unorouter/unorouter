import type { Locale } from "next-intl";
import type { BadgeStats } from "../cache";
import { t } from "../i18n";
import { renderBadge, themeVars, formatCompact, type Theme } from "../satori";
import {
  Card,
  Brand,
  Row,
  Dot,
  MonoValue,
  FONT_SANS,
  pulseDot,
} from "./components";

export async function generateHero(
  stats: BadgeStats,
  locale: Locale,
  theme: Theme,
  _ref?: string,
): Promise<string> {
  const c = themeVars(theme);
  const tokenCount = formatCompact(stats.tokenUsed);
  const tokensLabel = t(locale, "BADGE.TOKENS_SERVED");
  const W = 500;
  const H = 260;

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
        <MonoValue value={tokenCount} c={c} size={16} />
        <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: c.muted }}>
          {tokensLabel}
        </span>
      </Row>
    </Card>
  );

  return renderBadge(
    node,
    W,
    H,
    pulseDot(
      28 + tokenCount.length * 10 + tokensLabel.length * 6 + 24,
      H - 34,
      3,
      c.accent,
    ),
  );
}
