import { env } from "@/lib/config/env";
import { REFERRAL_DIMS, resolveDims } from "../lib/config";
import { t } from "../i18n";
import { Brand, Card, Col, Row } from "../lib/primitives";
import { renderBadge } from "../lib/render";
import { themeVars } from "../lib/theme";
import { FONT_MONO, FONT_SANS } from "../lib/typography";
import type { BadgeCtx } from "../route";

export async function generateReferral(ctx: BadgeCtx): Promise<string> {
  const c = themeVars(ctx.theme);
  const d = resolveDims(REFERRAL_DIMS, ctx.size);
  const ref = ctx.ref ?? "YOUR_CODE";
  const domain = new URL(env.appUrl).host;
  const url = `${domain}/?ref=${ref}`;

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

  return renderBadge(node, d.W, d.H);
}
