import type { Locale } from "next-intl";
import type { BadgeStats } from "../cache";
import { t } from "../i18n";
import { renderBadge, themeVars, formatCompact, type Theme } from "../satori";
import {
  Card,
  Brand,
  Col,
  Row,
  Stat,
  Divider,
  Dot,
  FONT_SANS,
  pulseDot,
} from "./components";

export async function generateSponsor(
  stats: BadgeStats,
  locale: Locale,
  theme: Theme,
  _ref?: string,
): Promise<string> {
  const c = themeVars(theme);
  const tokenCount = formatCompact(stats.tokenUsed);
  const W = 800;
  const H = 250;

  const node = (
    <Card c={c}>
      {/* Left: brand + bullets + CTA */}
      <Col
        style={{ padding: 32, flexGrow: 1, justifyContent: "space-between" }}
      >
        <Brand c={c} logoSize={44} fontSize={20} gap={14} />
        <Col style={{ marginTop: 8 }}>
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 13,
              color: c.muted,
              letterSpacing: 0.5,
            }}
          >
            {t(locale, "BADGE.UNIFIED_INTELLIGENCE_API")}
          </span>
          <Dot text={t(locale, "BADGE.MODELS_ONE_ENDPOINT")} c={c} />
          <Dot text={t(locale, "BADGE.SMART_ROUTING")} c={c} />
          <Dot text={t(locale, "BADGE.CHEAPEST_API")} c={c} />
        </Col>
        <Row
          style={{
            marginTop: 12,
            backgroundColor: c.text,
            borderRadius: 6,
            padding: "6px 20px",
            alignSelf: "flex-start",
          }}
        >
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 11,
              fontWeight: 600,
              color: c.bg,
              letterSpacing: 0.5,
            }}
          >
            {t(locale, "BADGE.GET_STARTED")}
          </span>
        </Row>
      </Col>

      <Divider c={c} margin="32px 0" opacity={0.5} />

      {/* Right: stats */}
      <Col style={{ padding: 32, width: 300, justifyContent: "space-between" }}>
        <Stat
          value={tokenCount}
          label={t(locale, "BADGE.TOKENS_SERVED")}
          c={c}
          size={32}
        />
        <Stat
          value={`${formatCompact(stats.requestCount)}+`}
          label="REQUESTS"
          c={c}
          size={22}
        />
        <Stat
          value="12+"
          label={t(locale, "BADGE.PROVIDERS")}
          c={c}
          size={22}
        />
      </Col>
    </Card>
  );

  return renderBadge(
    node,
    W,
    H,
    pulseDot(W - 300 + 32 + tokenCount.length * 20 + 24, 52, 4, c.accent),
  );
}
