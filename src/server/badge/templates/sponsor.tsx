import type { BadgeSize } from "@/lib/validation/badge";
import { Dot, FONT_SANS, MonoValue, Stat } from "../elements/typography";
import { cipherMarker } from "../elements/cipher";
import { t } from "../lib/cache";
import { Brand, Card, Col, Divider, Row } from "../elements/primitives";
import { renderBadgeTemplate } from "../lib/utils";
import { themeVars } from "../lib/theme";
import type { BadgeCtx, BadgeDimsBase, CipherTarget } from "../lib/types";

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
    W: 700,
    H: 245,
    pad: 28,
    layout: "twoColumn",
    logoSize: 38,
    brandFont: 18,
    brandGap: 12,
    statSize: 19,
    labelSize: 11,
    dotSize: 7,
    rightWidth: 300,
    bulletFont: 12,
    ctaFont: 10,
    modelCountFont: 12,
  },
  lg: {
    W: 860,
    H: 300,
    pad: 34,
    layout: "twoColumn",
    logoSize: 46,
    brandFont: 22,
    brandGap: 14,
    statSize: 24,
    labelSize: 13,
    dotSize: 9,
    rightWidth: 370,
    bulletFont: 14,
    ctaFont: 12,
    modelCountFont: 14,
  },
  xl: {
    W: 1040,
    H: 370,
    pad: 42,
    layout: "twoColumn",
    logoSize: 56,
    brandFont: 27,
    brandGap: 18,
    statSize: 30,
    labelSize: 16,
    dotSize: 11,
    rightWidth: 450,
    bulletFont: 17,
    ctaFont: 14,
    modelCountFont: 17,
  },
};

export async function generateSponsor(ctx: BadgeCtx): Promise<string> {
  const c = themeVars(ctx.theme);
  const d = DIMS[ctx.size]!;
  const tokenCount = ctx.stats.tokenUsed.toLocaleString("en-US");
  const requestCount = ctx.stats.requestCount.toLocaleString("en-US");
  const tpmCount = ctx.stats.avgTpm.toLocaleString("en-US");
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

  return renderBadgeTemplate({
    node,
    width: d.W,
    height: d.H,
    pulseDot: { markerColor: c.pulseDotMarker, accentColor: c.accent },
    cipherTargets: targets,
    staticMode: ctx.staticMode,
  });
}
