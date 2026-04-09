import type { Locale } from "next-intl";
import { t } from "../i18n";
import { renderBadge, themeVars, type Theme } from "../satori";
import { Brand, Card, Col, FONT_MONO, FONT_SANS, Row } from "./components";

export async function generateReferral(
  locale: Locale,
  theme: Theme,
  ref: string,
): Promise<string> {
  const c = themeVars(theme);
  const url = `unorouter.ai/?ref=${ref}`;
  const W = 480;
  const H = 160;

  const node = (
    <Card
      c={c}
      style={{
        flexDirection: "column",
        padding: 28,
        justifyContent: "space-between",
      }}
    >
      <Row style={{ alignItems: "center", justifyContent: "space-between" }}>
        <Brand c={c} logoSize={32} fontSize={16} gap={10} />
        <Row
          style={{
            backgroundColor: c.accent,
            borderRadius: 4,
            padding: "3px 10px",
          }}
        >
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 10,
              fontWeight: 700,
              color: c.bg,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {t(locale, "BADGE.REFERRAL")}
          </span>
        </Row>
      </Row>

      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: 14,
          color: c.muted,
        }}
      >
        {t(locale, "BADGE.REFERRAL_CTA")}
      </span>

      <Row
        style={{
          backgroundColor: c.border,
          borderRadius: 6,
          padding: "8px 16px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 14,
            fontWeight: 700,
            color: c.text,
            letterSpacing: 0.5,
          }}
        >
          {url}
        </span>
        <Col
          style={{
            backgroundColor: c.accent,
            borderRadius: 4,
            padding: "4px 12px",
          }}
        >
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 10,
              fontWeight: 700,
              color: c.bg,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {t(locale, "BADGE.GET_STARTED")}
          </span>
        </Col>
      </Row>
    </Card>
  );

  return renderBadge(node, W, H);
}
