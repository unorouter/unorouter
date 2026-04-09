import type { Locale } from "next-intl";
import { t } from "../i18n";
import {
  renderBadge,
  themeVars,
  type Theme,
  type ThemeColors,
} from "../satori";
import {
  Card,
  Row,
  BrandName,
  Label,
  FONT_SANS,
  FONT_MONO,
} from "./components";

interface PricingRow {
  model: string;
  direct: string;
  ours: string;
  discount: string;
}

const PRICING_DATA: PricingRow[] = [
  { model: "GPT-4o", direct: "$2.50", ours: "$2.00", discount: "-20%" },
  { model: "Claude Sonnet", direct: "$3.00", ours: "$2.40", discount: "-20%" },
  { model: "Gemini Pro", direct: "$1.25", ours: "$1.00", discount: "-20%" },
  { model: "DeepSeek V3", direct: "$0.90", ours: "$0.70", discount: "-22%" },
];

function PriceRow(props: { row: PricingRow; c: ThemeColors }) {
  const c = props.c;
  const row = props.row;
  return (
    <Row style={{ alignItems: "center", padding: "10px 0" }}>
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: 13,
          color: c.text,
          width: 200,
        }}
      >
        {row.model}
      </span>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 13,
          color: c.muted,
          width: 100,
          textDecoration: "line-through",
        }}
      >
        {row.direct}
      </span>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 13,
          fontWeight: 700,
          color: c.text,
          width: 100,
        }}
      >
        {row.ours}
      </span>
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
          {row.discount}
        </span>
      </Row>
    </Row>
  );
}

export async function generatePricing(
  locale: Locale,
  theme: Theme,
): Promise<string> {
  const c = themeVars(theme);
  const W = 520;
  const H = 300;

  const node = (
    <Card c={c} style={{ flexDirection: "column", padding: 28 }}>
      <Row style={{ alignItems: "center", gap: 12 }}>
        <BrandName c={c} />
        <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: c.muted }}>
          | {t(locale, "BADGE.SAVE_UP_TO")} 40%
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
      {PRICING_DATA.map((row) => (
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
