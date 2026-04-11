import type { Locale } from "next-intl";
import type { BadgePricing, BadgeStats } from "../cache";
import { t } from "../i18n";
import { formatFull } from "../lib/format";
import { Card, Brand, Col, Row, Divider } from "../lib/primitives";
import { renderBadge } from "../lib/render";
import { themeVars, type Theme } from "../lib/theme";
import { Stat, Dot, FONT_SANS, MonoValue } from "../lib/typography";
import { cipherMarker, isStaticMode, processCipherMarkers } from "./cipher";

export async function generateSponsor(
  stats: BadgeStats,
  locale: Locale,
  theme: Theme,
  pricing: BadgePricing,
  _ref?: string,
): Promise<string> {
  const c = themeVars(theme);
  const tokenCount = formatFull(stats.tokenUsed);
  const requestCount = formatFull(stats.requestCount);
  const tpmCount = formatFull(stats.avgTpm);
  const modelCount = `${pricing.modelCount}+`;
  const W = 800;
  const H = 280;
  const m1 = cipherMarker(1);
  const m2 = cipherMarker(2);
  const m3 = cipherMarker(3);
  const m4 = cipherMarker(4);

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
          <Row style={{ alignItems: "center", gap: 4, marginTop: 4 }}>
            <Row
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                backgroundColor: c.accent,
              }}
            />
            <MonoValue value={modelCount} c={c} size={13} cipherMarker={m4} />
            <span style={{ fontFamily: FONT_SANS, fontSize: 13, color: c.text }}>
              {t(locale, "BADGE.MODELS_ONE_ENDPOINT_SUFFIX")}
            </span>
          </Row>
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
      <Col style={{ padding: 32, width: 340, justifyContent: "center", gap: 12 }}>
        <Row style={{ alignItems: "center", gap: 10 }}>
          <Stat
            value={tokenCount}
            label={t(locale, "BADGE.TOKENS_SERVED")}
            c={c}
            size={22}
            cipherMarker={m1}
          />
          <Row
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#fe0099",
              marginBottom: 12,
            }}
          />
        </Row>
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

  let svg = await renderBadge(node, W, H);

  // Replace marker dot (#fe0099) with a pulse-animated circle (SVG) or static circle (PNG)
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
    { value: tokenCount, fontSize: 22, color: c.text, markerColor: m1, loop: true },
    { value: requestCount, fontSize: 22, color: c.text, markerColor: m2, loop: true },
    { value: tpmCount, fontSize: 22, color: c.text, markerColor: m3, loop: true },
    { value: modelCount, fontSize: 13, color: c.text, markerColor: m4 },
  ]);
  return svg;
}
