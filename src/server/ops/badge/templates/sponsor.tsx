import type { BadgeSize } from "@/lib/validation/badge";
import { cipherMarker } from "../elements/cipher";
import { Brand, Card, Col, Divider, Row } from "../elements/primitives";
import { Dot, FONT_SANS, MonoValue, Stat } from "../elements/typography";
import { t } from "../lib/cache";
import { THEME_COLORS } from "../lib/theme";
import type { BadgeCtx, BadgeDimsBase, CipherTarget } from "../lib/types";
import { renderBadgeTemplate } from "../lib/utils";

interface Dims extends BadgeDimsBase {
  layout: "horizontal" | "twoColumn";
  logoSize: number;
  brandFont: number;
  brandGap: number;
  statSize: number;
  labelSize: number;
  dotSize: number;
  rightWidth: number;
  bulletFont: number;
  ctaFont: number;
  modelCountFont: number;
}

const DIMS: Partial<Record<BadgeSize, Dims>> = {
  xs: {
    W: 480,
    H: 90,
    pad: 16,
    layout: "horizontal",
    logoSize: 22,
    brandFont: 11,
    brandGap: 8,
    statSize: 13,
    labelSize: 7,
    dotSize: 5,
    rightWidth: 0,
    bulletFont: 0,
    ctaFont: 0,
    modelCountFont: 0,
  },
  sm: {
    W: 600,
    H: 120,
    pad: 24,
    layout: "horizontal",
    logoSize: 28,
    brandFont: 14,
    brandGap: 10,
    statSize: 16,
    labelSize: 8,
    dotSize: 7,
    rightWidth: 0,
    bulletFont: 0,
    ctaFont: 0,
    modelCountFont: 0,
  },
  md: {
    W: 640,
    H: 230,
    pad: 26,
    layout: "twoColumn",
    logoSize: 36,
    brandFont: 17,
    brandGap: 10,
    statSize: 20,
    labelSize: 11,
    dotSize: 7,
    rightWidth: 270,
    bulletFont: 11,
    ctaFont: 10,
    modelCountFont: 11,
  },
  lg: {
    W: 780,
    H: 290,
    pad: 32,
    layout: "twoColumn",
    logoSize: 48,
    brandFont: 24,
    brandGap: 14,
    statSize: 28,
    labelSize: 15,
    dotSize: 9,
    rightWidth: 340,
    bulletFont: 15,
    ctaFont: 13,
    modelCountFont: 15,
  },
  xl: {
    W: 940,
    H: 350,
    pad: 40,
    layout: "twoColumn",
    logoSize: 60,
    brandFont: 30,
    brandGap: 18,
    statSize: 36,
    labelSize: 19,
    dotSize: 11,
    rightWidth: 420,
    bulletFont: 19,
    ctaFont: 16,
    modelCountFont: 19,
  },
  og: {
    W: 1200,
    H: 630,
    pad: 64,
    layout: "twoColumn",
    logoSize: 130,
    brandFont: 60,
    brandGap: 28,
    statSize: 40,
    labelSize: 22,
    dotSize: 14,
    rightWidth: 540,
    bulletFont: 34,
    ctaFont: 30,
    modelCountFont: 34,
  },
};

export async function generateSponsor(ctx: BadgeCtx): Promise<string> {
  const c = THEME_COLORS[ctx.theme];
  const d = DIMS[ctx.size]!;
  const tokenCount = ctx.stats.tokenUsed.toLocaleString("en-US");
  const requestCount = ctx.stats.requestCount.toLocaleString("en-US");
  const tpmCount = ctx.stats.avgTpm.toLocaleString("en-US");
  const modelCount = `${ctx.pricing.modelCount}+`;
  const freeCount = ctx.pricing.freeCount.toLocaleString("en-US");
  const paidCount = ctx.pricing.paidCount.toLocaleString("en-US");

  const m1 = cipherMarker(1);
  const m2 = cipherMarker(2);
  const m3 = cipherMarker(3);
  const m4 = cipherMarker(4);
  const m5 = cipherMarker(5);
  const m6 = cipherMarker(6);

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

    return renderBadgeTemplate({
      node,
      width: d.W,
      height: d.H,
      pulseDot: { markerColor: c.pulseDotMarker, accentColor: c.accent },
      cipherTargets: [
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
      ],
      staticMode: ctx.staticMode,
    });
  }

  const node = (
    <Card c={c}>
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
              value={freeCount}
              c={c}
              size={d.modelCountFont}
              cipherMarker={m5}
            />
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: d.bulletFont,
                color: c.text,
              }}
            >
              {t(ctx.locale, "BADGE.FREE")}
            </span>
            <MonoValue
              value={paidCount}
              c={c}
              size={d.modelCountFont}
              cipherMarker={m6}
            />
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: d.bulletFont,
                color: c.text,
              }}
            >
              {t(ctx.locale, "BADGE.PAID")}
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

      <Col
        style={{
          padding: `${d.pad}px ${d.pad}px ${d.pad}px 24px`,
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
    {
      value: freeCount,
      fontSize: d.modelCountFont,
      color: c.text,
      markerColor: m5,
    },
    {
      value: paidCount,
      fontSize: d.modelCountFont,
      color: c.text,
      markerColor: m6,
    },
  ];

  return renderBadgeTemplate({
    node,
    width: d.W,
    height: d.H,
    pulseDot: { markerColor: c.pulseDotMarker, accentColor: c.accent },
    cipherTargets: targets,
    staticMode: ctx.staticMode,
  });
}
