import type { Locale } from "next-intl";
import type { BadgeStats } from "../cache";
import { t } from "../i18n";
import {
  renderBadge,
  themeVars,
  formatFull,
  type Theme,
} from "../satori";
import { cipherMarker, processCipherMarkers } from "./cipher";
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
  const tokenCount = formatFull(stats.tokenUsed);
  const requestCount = formatFull(stats.requestCount);
  const tpmCount = formatFull(stats.avgTpm);
  const W = 800;
  const H = 280;
  const m1 = cipherMarker(1);
  const m2 = cipherMarker(2);
  const m3 = cipherMarker(3);

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
      <Col style={{ padding: 32, width: 340, justifyContent: "space-between" }}>
        <Stat
          value={tokenCount}
          label={t(locale, "BADGE.TOKENS_SERVED")}
          c={c}
          size={22}
          cipherMarker={m1}
        />
        <Stat
          value={requestCount}
          label="REQUESTS"
          c={c}
          size={22}
          cipherMarker={m2}
        />
        <Stat
          value={tpmCount}
          label={t(locale, "BADGE.TOKENS_MIN")}
          c={c}
          size={22}
          cipherMarker={m3}
        />
      </Col>
    </Card>
  );

  let svg = await renderBadge(
    node,
    W,
    H,
    pulseDot(W - 340 + 32 + tokenCount.length * 14 + 24, 52, 4, c.accent),
  );
  svg = await processCipherMarkers(svg, [
    { value: tokenCount, fontSize: 22, color: c.text, markerColor: m1, loop: true },
    { value: requestCount, fontSize: 22, color: c.text, markerColor: m2, loop: true },
    { value: tpmCount, fontSize: 22, color: c.text, markerColor: m3, loop: true },
  ]);
  return svg;
}
