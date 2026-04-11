import { formatPrice } from "@/lib/utils/base";
import type { Locale } from "next-intl";
import type { BadgePricingRow } from "../cache";
import { t } from "../i18n";
import { Brand, Card, Row } from "../lib/primitives";
import { renderBadge } from "../lib/render";
import { themeVars, type Theme, type ThemeColors } from "../lib/theme";
import { FONT_MONO, FONT_SANS, Label, MonoValue } from "../lib/typography";
import {
  cipherMarker,
  processCipherMarkers,
  type CipherTarget,
} from "./cipher";
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
  currentMarker: string;
  originalMarker?: string;
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
            color: props.originalMarker ?? props.c.muted,
            textDecoration: "line-through",
          }}
        >
          {formatPrice(props.original)}
        </span>
      ) : (
        <span style={{ fontSize: 9 }}> </span>
      )}
      <MonoValue
        value={formatPrice(props.current)}
        c={props.c}
        size={12}
        cipherMarker={props.currentMarker}
      />
    </div>
  );
}

function PriceRow(props: {
  row: BadgePricingRow;
  c: ThemeColors;
  inputCurrentMarker: string;
  inputOriginalMarker?: string;
  outputCurrentMarker: string;
  outputOriginalMarker?: string;
  discountMarker?: string;
}) {
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
          src={svgDataUri(iconSvg, c.text)}
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
        currentMarker={props.inputCurrentMarker}
        originalMarker={props.inputOriginalMarker}
      />
      <PriceCell
        original={row.originalOutputPrice}
        current={row.outputPrice}
        c={c}
        width={100}
        currentMarker={props.outputCurrentMarker}
        originalMarker={props.outputOriginalMarker}
      />
      {disc ? (
        <Row
          style={{
            backgroundColor: c.accentMuted,
            borderRadius: 4,
            padding: "3px 8px",
          }}
        >
          <MonoValue
            value={disc}
            c={{ ...c, text: c.accent }}
            size={11}
            cipherMarker={props.discountMarker}
          />
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

  // Assign cipher markers: 1 = header %, then 5 per row (inputCurrent, inputOriginal, outputCurrent, outputOriginal, discount)
  let markerIdx = 1;
  const headerMarker = cipherMarker(markerIdx++);
  const headerValue = `${maxDiscount}%`;

  const rowMarkers = rows.map((row) => {
    const inputCurrent = cipherMarker(markerIdx++);
    const inputOriginal = row.originalInputPrice !== null ? cipherMarker(markerIdx++) : undefined;
    const outputCurrent = cipherMarker(markerIdx++);
    const outputOriginal = row.originalOutputPrice !== null ? cipherMarker(markerIdx++) : undefined;
    const disc = row.originalInputPrice ? discount(row.originalInputPrice, row.inputPrice) : "";
    const discountM = disc ? cipherMarker(markerIdx++) : undefined;
    return { inputCurrent, inputOriginal, outputCurrent, outputOriginal, discountM, disc };
  });

  const node = (
    <Card c={c} style={{ flexDirection: "column", padding: 28 }}>
      <Row style={{ alignItems: "center", gap: 8 }}>
        <Brand c={c} logoSize={24} fontSize={14} gap={8} />
        <span style={{ fontFamily: FONT_SANS, fontSize: 14, color: c.muted }}>
          | {t(locale, "BADGE.SAVE_UP_TO")}
        </span>
        <MonoValue value={headerValue} c={c} size={14} cipherMarker={headerMarker} />
      </Row>
      <Row
        style={{
          borderBottom: `1px solid ${c.border}`,
          padding: "12px 0",
          marginTop: 8,
        }}
      >
        <Label text={t(locale, "BADGE.MODEL")} c={c} style={{ width: 180 }} />
        <Label text={t(locale, "BADGE.INPUT")} c={c} style={{ width: 100 }} />
        <Label text={t(locale, "BADGE.OUTPUT")} c={c} style={{ width: 100 }} />
      </Row>
      {rows.map((row, i) => (
        <PriceRow
          key={row.model}
          row={row}
          c={c}
          inputCurrentMarker={rowMarkers[i].inputCurrent}
          inputOriginalMarker={rowMarkers[i].inputOriginal}
          outputCurrentMarker={rowMarkers[i].outputCurrent}
          outputOriginalMarker={rowMarkers[i].outputOriginal}
          discountMarker={rowMarkers[i].discountM}
        />
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

  // Build cipher targets
  const targets: CipherTarget[] = [
    { value: headerValue, fontSize: 14, color: c.text, markerColor: headerMarker },
  ];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rm = rowMarkers[i];

    targets.push({
      value: formatPrice(row.inputPrice),
      fontSize: 12,
      color: c.text,
      markerColor: rm.inputCurrent,
    });
    if (rm.inputOriginal && row.originalInputPrice !== null) {
      targets.push({
        value: formatPrice(row.originalInputPrice),
        fontSize: 9,
        color: c.muted,
        markerColor: rm.inputOriginal,
      });
    }
    targets.push({
      value: formatPrice(row.outputPrice),
      fontSize: 12,
      color: c.text,
      markerColor: rm.outputCurrent,
    });
    if (rm.outputOriginal && row.originalOutputPrice !== null) {
      targets.push({
        value: formatPrice(row.originalOutputPrice),
        fontSize: 9,
        color: c.muted,
        markerColor: rm.outputOriginal,
      });
    }
    if (rm.discountM && rm.disc) {
      targets.push({
        value: rm.disc,
        fontSize: 11,
        color: c.accent,
        markerColor: rm.discountM,
      });
    }
  }

  let svg = await renderBadge(node, W, H);
  svg = await processCipherMarkers(svg, targets);
  return svg;
}
