import { formatPrice } from "@/lib/utils/base";
import type { Locale } from "next-intl";
import type { BadgePricingRow } from "../cache";
import { t } from "../i18n";
import {
  renderBadge,
  themeVars,
  type Theme,
  type ThemeColors,
} from "../satori";
import {
  BrandName,
  Card,
  FONT_MONO,
  FONT_SANS,
  Label,
  Row,
} from "./components";
import { getVendorIcon, svgDataUri } from "./providers";

function discount(original: number, current: number): string {
  if (original <= 0) return "";
  const pct = Math.round((1 - current / original) * 100);
  return pct > 0 ? `-${pct}%` : "";
}

/** Compact price cell: shows strikethrough original + bold current */
function PriceCell(props: {
  original: number | null;
  current: number;
  c: ThemeColors;
  width: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: props.width,
        gap: 1,
      }}
    >
      {props.original !== null ? (
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: props.c.muted,
            textDecoration: "line-through",
          }}
        >
          {formatPrice(props.original)}
        </span>
      ) : (
        <span style={{ fontSize: 9 }}> </span>
      )}
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 12,
          fontWeight: 700,
          color: props.c.text,
        }}
      >
        {formatPrice(props.current)}
      </span>
    </div>
  );
}

function PriceRow(props: { row: BadgePricingRow; c: ThemeColors }) {
  const c = props.c;
  const row = props.row;
  const disc = row.originalInputPrice
    ? discount(row.originalInputPrice, row.inputPrice)
    : "";

  const iconSvg = getVendorIcon(row.vendor);

  return (
    <Row style={{ alignItems: "center", padding: "8px 0" }}>
      {iconSvg && (
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        <img
          src={svgDataUri(iconSvg, c.muted)}
          width={14}
          height={14}
          style={{ marginRight: 6 }}
        />
      )}
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: 11,
          color: c.text,
          width: 160,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {row.model}
      </span>
      <PriceCell
        original={row.originalInputPrice}
        current={row.inputPrice}
        c={c}
        width={100}
      />
      <PriceCell
        original={row.originalOutputPrice}
        current={row.outputPrice}
        c={c}
        width={100}
      />
      {disc ? (
        <Row
          style={{
            backgroundColor: c.accentMuted,
            borderRadius: 4,
            padding: "3px 8px",
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
  const W = 560;
  const H = 320;

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
        <Label
          text={t(locale, "BADGE.MODEL")}
          c={c}
          style={{ width: 180 }}
        />
        <Label
          text={t(locale, "BADGE.INPUT")}
          c={c}
          style={{ width: 100 }}
        />
        <Label
          text={t(locale, "BADGE.OUTPUT")}
          c={c}
          style={{ width: 100 }}
        />
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
