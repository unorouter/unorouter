import { env } from "@/lib/config/env";
import type { BadgeSize } from "@/lib/validation/badge";
import { FONT_MONO, FONT_SANS } from "../elements/typography";
import { t } from "../lib/cache";
import { Brand, Card, Col, Row } from "../elements/primitives";
import { renderBadgeTemplate } from "../lib/utils";
import { THEME_COLORS } from "../lib/theme";
import type { BadgeCtx, BadgeDimsBase } from "../lib/types";

interface Dims extends BadgeDimsBase {
  logoSize: number;
  brandFont: number;
  brandGap: number;
  badgeFont: number;
  subtitleFont: number;
  urlFont: number;
  urlPad: string;
  ctaFont: number;
  ctaPad: string;
  radius: number;
  showSubtitle: boolean;
  showCta: boolean;
}

const DIMS: Partial<Record<BadgeSize, Dims>> = {
  xs: {
    W: 300,
    H: 80,
    pad: 12,
    logoSize: 20,
    brandFont: 10,
    brandGap: 5,
    badgeFont: 8,
    subtitleFont: 9,
    urlFont: 9,
    urlPad: "4px 10px",
    ctaFont: 8,
    ctaPad: "2px 6px",
    radius: 4,
    showSubtitle: false,
    showCta: false,
  },
  sm: {
    W: 360,
    H: 100,
    pad: 16,
    logoSize: 24,
    brandFont: 12,
    brandGap: 6,
    badgeFont: 9,
    subtitleFont: 11,
    urlFont: 11,
    urlPad: "5px 12px",
    ctaFont: 9,
    ctaPad: "3px 8px",
    radius: 5,
    showSubtitle: false,
    showCta: false,
  },
  md: {
    W: 420,
    H: 140,
    pad: 24,
    logoSize: 28,
    brandFont: 14,
    brandGap: 8,
    badgeFont: 10,
    subtitleFont: 12,
    urlFont: 12,
    urlPad: "6px 14px",
    ctaFont: 10,
    ctaPad: "3px 10px",
    radius: 6,
    showSubtitle: true,
    showCta: true,
  },
  lg: {
    W: 520,
    H: 170,
    pad: 30,
    logoSize: 34,
    brandFont: 17,
    brandGap: 10,
    badgeFont: 12,
    subtitleFont: 14,
    urlFont: 14,
    urlPad: "7px 16px",
    ctaFont: 12,
    ctaPad: "4px 12px",
    radius: 7,
    showSubtitle: true,
    showCta: true,
  },
  xl: {
    W: 640,
    H: 210,
    pad: 38,
    logoSize: 42,
    brandFont: 21,
    brandGap: 12,
    badgeFont: 14,
    subtitleFont: 17,
    urlFont: 17,
    urlPad: "8px 20px",
    ctaFont: 14,
    ctaPad: "5px 14px",
    radius: 8,
    showSubtitle: true,
    showCta: true,
  },
  og: {
    W: 1200,
    H: 630,
    pad: 96,
    logoSize: 120,
    brandFont: 56,
    brandGap: 32,
    badgeFont: 36,
    subtitleFont: 42,
    urlFont: 44,
    urlPad: "24px 48px",
    ctaFont: 36,
    ctaPad: "14px 36px",
    radius: 24,
    showSubtitle: true,
    showCta: true,
  },
};

export async function generateReferral(ctx: BadgeCtx): Promise<string> {
  const c = THEME_COLORS[ctx.theme];
  const d = DIMS[ctx.size]!;
  const ref = ctx.ref ?? "YOUR_CODE";
  const domain = new URL(env.appUrl).host;
  const url = `${domain}/?aff=${ref}`;

  const node = (
    <Card
      c={c}
      style={{
        flexDirection: "column",
        padding: d.pad,
        justifyContent: "space-between",
      }}
    >
      <Row style={{ alignItems: "center", justifyContent: "space-between" }}>
        <Brand
          c={c}
          logoSize={d.logoSize}
          fontSize={d.brandFont}
          gap={d.brandGap}
        />
        <Row
          style={{
            backgroundColor: c.brandRed,
            borderRadius: 4,
            padding: "3px 10px",
          }}
        >
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: d.badgeFont,
              fontWeight: 700,
              color: c.badgeText,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {t(ctx.locale, "BADGE.REFERRAL")}
          </span>
        </Row>
      </Row>

      {d.showSubtitle && (
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: d.subtitleFont,
            color: c.muted,
          }}
        >
          {t(ctx.locale, "BADGE.REFERRAL_CTA")}
        </span>
      )}

      <Row
        style={{
          backgroundColor: c.border,
          borderRadius: d.radius,
          padding: d.urlPad,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: d.urlFont,
            fontWeight: 700,
            color: c.text,
            letterSpacing: 0.5,
          }}
        >
          {url}
        </span>
        {d.showCta && (
          <Col
            style={{
              backgroundColor: c.brandRed,
              borderRadius: 4,
              padding: d.ctaPad,
            }}
          >
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: d.ctaFont,
                fontWeight: 700,
                color: c.badgeText,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {t(ctx.locale, "BADGE.GET_STARTED")}
            </span>
          </Col>
        )}
      </Row>
    </Card>
  );

  return renderBadgeTemplate({
    node,
    width: d.W,
    height: d.H,
    staticMode: ctx.staticMode,
  });
}
