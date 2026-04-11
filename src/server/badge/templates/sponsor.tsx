import { SPONSOR_DIMS, resolveDims } from "../lib/config";
import { t } from "../i18n";
import { formatFull } from "../lib/format";
import { Card, Brand, Col, Row, Divider } from "../lib/primitives";
import { renderBadge } from "../lib/render";
import { themeVars } from "../lib/theme";
import { Stat, Dot, FONT_SANS, MonoValue } from "../lib/typography";
import type { BadgeCtx } from "../route";
import {
  cipherMarker,
  processCipherMarkers,
  replacePulseDotMarker,
  type CipherTarget,
} from "./cipher";

export async function generateSponsor(ctx: BadgeCtx): Promise<string> {
  const c = themeVars(ctx.theme);
  const d = resolveDims(SPONSOR_DIMS, ctx.size);
  const tokenCount = formatFull(ctx.stats.tokenUsed);
  const requestCount = formatFull(ctx.stats.requestCount);
  const tpmCount = formatFull(ctx.stats.avgTpm);
  const modelCount = `${ctx.pricing.modelCount}+`;

  const m1 = cipherMarker(1);
  const m2 = cipherMarker(2);
  const m3 = cipherMarker(3);
  const m4 = cipherMarker(4);

  if (d.layout === "horizontal") {
    const node = (
      <Card c={c} style={{ alignItems: "center", padding: `0 ${d.pad}px` }}>
        <Brand
          c={c}
          logoSize={d.logoSize}
          fontSize={d.brandFont}
          gap={d.brandGap}
        />
        <Divider c={c} margin={`0 ${d.pad - 6}px`} opacity={0.5} />
        <Row style={{ alignItems: "center", gap: 20, flexGrow: 1 }}>
          <Stat
            value={tokenCount}
            label={t(ctx.locale, "BADGE.TOKENS_SERVED")}
            c={c}
            size={d.statSize}
            labelSize={d.labelSize}
            cipherMarker={m1}
          />
          <Stat
            value={requestCount}
            label="REQUESTS"
            c={c}
            size={d.statSize}
            labelSize={d.labelSize}
            cipherMarker={m2}
          />
          <Stat
            value={tpmCount}
            label={t(ctx.locale, "BADGE.TOKENS_MIN")}
            c={c}
            size={d.statSize}
            labelSize={d.labelSize}
            cipherMarker={m3}
          />
        </Row>
        <Row
          style={{
            width: d.dotSize,
            height: d.dotSize,
            borderRadius: "50%",
            backgroundColor: c.pulseDotMarker,
            marginLeft: "auto",
          }}
        />
      </Card>
    );

    let svg = await renderBadge(node, d.W, d.H);
    svg = replacePulseDotMarker(svg, c.pulseDotMarker, c.accent);
    svg = await processCipherMarkers(svg, [
      {
        value: tokenCount,
        fontSize: d.statSize,
        color: c.text,
        markerColor: m1,
        loop: true,
      },
      {
        value: requestCount,
        fontSize: d.statSize,
        color: c.text,
        markerColor: m2,
        loop: true,
      },
      {
        value: tpmCount,
        fontSize: d.statSize,
        color: c.text,
        markerColor: m3,
        loop: true,
      },
    ]);
    return svg;
  }

  // Two-column layout
  const node = (
    <Card c={c}>
      {/* Left: brand + bullets + CTA */}
      <Col
        style={{ padding: d.pad, flexGrow: 1, justifyContent: "space-between" }}
      >
        <Brand
          c={c}
          logoSize={d.logoSize}
          fontSize={d.brandFont}
          gap={d.brandGap}
        />
        <Col style={{ marginTop: 8 }}>
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: d.bulletFont,
              color: c.muted,
              letterSpacing: 0.5,
            }}
          >
            {t(ctx.locale, "BADGE.UNIFIED_INTELLIGENCE_API")}
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
            <MonoValue
              value={modelCount}
              c={c}
              size={d.modelCountFont}
              cipherMarker={m4}
            />
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: d.bulletFont,
                color: c.text,
              }}
            >
              {t(ctx.locale, "BADGE.MODELS_ONE_ENDPOINT_SUFFIX")}
            </span>
          </Row>
          <Dot
            text={t(ctx.locale, "BADGE.SMART_ROUTING")}
            c={c}
            fontSize={d.bulletFont}
          />
          <Dot
            text={t(ctx.locale, "BADGE.CHEAPEST_API")}
            c={c}
            fontSize={d.bulletFont}
          />
        </Col>
        <Row
          style={{
            marginTop: 10,
            backgroundColor: c.text,
            borderRadius: 6,
            padding: "5px 16px",
            alignSelf: "flex-start",
          }}
        >
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: d.ctaFont,
              fontWeight: 600,
              color: c.bg,
              letterSpacing: 0.5,
            }}
          >
            {t(ctx.locale, "BADGE.GET_STARTED")}
          </span>
        </Row>
      </Col>

      <Divider c={c} margin={`${d.pad}px 0`} opacity={0.5} />

      {/* Right: stats */}
      <Col
        style={{
          padding: d.pad,
          width: d.rightWidth,
          justifyContent: "center",
          gap: 10,
        }}
      >
        <Row style={{ alignItems: "center", gap: 10 }}>
          <Stat
            value={tokenCount}
            label={t(ctx.locale, "BADGE.TOKENS_SERVED")}
            c={c}
            size={d.statSize}
            cipherMarker={m1}
          />
          <Row
            style={{
              width: d.dotSize,
              height: d.dotSize,
              borderRadius: "50%",
              backgroundColor: c.pulseDotMarker,
              marginBottom: 12,
            }}
          />
        </Row>
        <Stat
          value={requestCount}
          label="REQUESTS"
          c={c}
          size={d.statSize}
          cipherMarker={m2}
        />
        <Stat
          value={tpmCount}
          label={t(ctx.locale, "BADGE.TOKENS_MIN")}
          c={c}
          size={d.statSize}
          cipherMarker={m3}
        />
      </Col>
    </Card>
  );

  let svg = await renderBadge(node, d.W, d.H);
  svg = replacePulseDotMarker(svg, c.pulseDotMarker, c.accent);

  const targets: CipherTarget[] = [
    {
      value: tokenCount,
      fontSize: d.statSize,
      color: c.text,
      markerColor: m1,
      loop: true,
    },
    {
      value: requestCount,
      fontSize: d.statSize,
      color: c.text,
      markerColor: m2,
      loop: true,
    },
    {
      value: tpmCount,
      fontSize: d.statSize,
      color: c.text,
      markerColor: m3,
      loop: true,
    },
    {
      value: modelCount,
      fontSize: d.modelCountFont,
      color: c.text,
      markerColor: m4,
    },
  ];

  svg = await processCipherMarkers(svg, targets);
  return svg;
}
