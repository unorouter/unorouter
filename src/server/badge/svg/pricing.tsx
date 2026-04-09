import type { Locale } from "next-intl";
import { formatPrice } from "@/lib/utils/base";
import type { BadgePricingRow } from "../cache";
import { t } from "../i18n";
import {
  renderBadge,
  themeVars,
  type Theme,
  type ThemeColors,
} from "../satori";
import { Card, Row, BrandName, Label, FONT_SANS, FONT_MONO } from "./components";

function discount(original: number, current: number): string {
  if (original <= 0) return "";
  const pct = Math.round((1 - current / original) * 100);
  return pct > 0 ? `-${pct}%` : "";
}

function PriceRow(props: { row: BadgePricingRow; c: ThemeColors }) {
  const c = props.c;
  const row = props.row;
  const disc = row.originalInputPrice
    ? discount(row.originalInputPrice, row.inputPrice)
    : "";

  return (
    <Row style={{ alignItems: "center", padding: "10px 0" }}>
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: 12,
          color: c.text,
          width: 200,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {row.model}
      </span>
      {row.originalInputPrice !== null ? (
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            color: c.muted,
            width: 100,
            textDecoration: "line-through",
          }}
        >
          {formatPrice(row.originalInputPrice)}
        </span>
      ) : (
        <span style={{ width: 100 }} />
      )}
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 12,
          fontWeight: 700,
          color: c.text,
          width: 100,
        }}
      >
        {formatPrice(row.inputPrice)}
      </span>
      {disc ? (
        <Row
          style={{
            backgroundColor: c.accent,
            opacity: 0.15,
            borderRadius: 4,
            padding: "2px 8px",
          }}
        >
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              fontWeight: 700,
              color: c.accent,
            }}
          >
            {disc}
          </span>
        </Row>
      ) : null}
    </Row>
  );
}

export async function generatePricing(
  locale: Locale,
  theme: Theme,
  rows: BadgePricingRow[],
): Promise<string> {
  const c = themeVars(theme);
  const W = 520;
  const H = 300;

  const maxDiscount = rows.reduce((max, r) => {
    if (!r.originalInputPrice) return max;
    const pct = Math.round((1 - r.inputPrice / r.originalInputPrice) * 100);
    return pct > max ? pct : max;
  }, 0);

  const node = (
    <Card c={c} style={{ flexDirection: "column", padding: 28 }}>
      <Row style={{ alignItems: "center", gap: 12 }}>
        <BrandName c={c} />
        <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: c.muted }}>
          | {t(locale, "BADGE.SAVE_UP_TO")} {maxDiscount}%
        </span>
      </Row>
      <Row
        style={{
          borderBottom: `1px solid ${c.border}`,
          padding: "12px 0",
          marginTop: 8,
        }}
      >
        <Label text={t(locale, "BADGE.MODEL")} c={c} style={{ width: 200 }} />
        <Label text={t(locale, "BADGE.DIRECT")} c={c} style={{ width: 100 }} />
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: 11,
            color: c.accent,
            letterSpacing: 0.5,
            fontWeight: 600,
            width: 100,
            textTransform: "uppercase",
          }}
        >
          UNOROUTER
        </span>
      </Row>
      {rows.map((row) => (
        <PriceRow key={row.model} row={row} c={c} />
      ))}
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: 10,
          color: c.muted,
          marginTop: 8,
        }}
      >
        * {t(locale, "BADGE.PRICES_NOTE")}
      </span>
    </Card>
  );

  return renderBadge(node, W, H);
}
