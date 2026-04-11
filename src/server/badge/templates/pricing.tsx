import { formatPrice } from "@/lib/utils/base";
import type { BadgePricingRow } from "../cache";
import { t } from "../i18n";
import { PRICING_DIMS, resolveDims } from "../lib/config";
import { Brand, Card, Row } from "../lib/primitives";
import { renderBadge } from "../lib/render";
import { themeVars, type ThemeColors } from "../lib/theme";
import { FONT_MONO, FONT_SANS, Label, MonoValue } from "../lib/typography";
import type { BadgeCtx } from "../route";
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
  showOriginal: boolean;
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
      {props.showOriginal && props.original !== null ? (
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 8,
            color: props.originalMarker ?? props.c.muted,
            textDecoration: "line-through",
          }}
        >
          {formatPrice(props.original)}
        </span>
      ) : props.showOriginal ? (
        <span style={{ fontSize: 8 }}> </span>
      ) : null}
      <MonoValue
        value={formatPrice(props.current)}
        c={props.c}
        size={11}
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
  showOriginal: boolean;
  modelWidth: number;
  priceWidth: number;
  iconSize: number;
}) {
  const c = props.c;
  const row = props.row;
  const disc =
    props.showOriginal && row.originalInputPrice
      ? discount(row.originalInputPrice, row.inputPrice)
      : "";

  const iconSvg = getVendorIcon(row.vendor);

  return (
    <Row style={{ alignItems: "center", padding: "6px 0" }}>
      {iconSvg && (
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        <img
          src={svgDataUri(iconSvg, c.text)}
          width={props.iconSize}
          height={props.iconSize}
          style={{ marginRight: 6 }}
        />
      )}
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: 10,
          color: c.text,
          width: props.modelWidth,
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
        width={props.priceWidth}
        currentMarker={props.inputCurrentMarker}
        originalMarker={props.inputOriginalMarker}
        showOriginal={props.showOriginal}
      />
      <PriceCell
        original={row.originalOutputPrice}
        current={row.outputPrice}
        c={c}
        width={props.priceWidth}
        currentMarker={props.outputCurrentMarker}
        originalMarker={props.outputOriginalMarker}
        showOriginal={props.showOriginal}
      />
      {disc ? (
        <Row
          style={{
            backgroundColor: c.accentMuted,
            borderRadius: 4,
            padding: "2px 6px",
          }}
        >
          <MonoValue
            value={disc}
            c={{ ...c, text: c.accent }}
            size={10}
            cipherMarker={props.discountMarker}
          />
        </Row>
      ) : null}
    </Row>
  );
}

export async function generatePricing(ctx: BadgeCtx): Promise<string> {
  const c = themeVars(ctx.theme);
  const d = resolveDims(PRICING_DIMS, ctx.size);

  const rows = ctx.pricing.rows;
  const displayRows = rows.slice(0, d.maxRows);

  const maxDiscount = rows.reduce((max, r) => {
    if (!r.originalInputPrice) return max;
    const pct = Math.round((1 - r.inputPrice / r.originalInputPrice) * 100);
    return pct > max ? pct : max;
  }, 0);

  // Assign cipher markers
  let markerIdx = 1;
  const headerMarker = cipherMarker(markerIdx++);
  const headerValue = `${maxDiscount}%`;

  const rowMarkers = displayRows.map((row) => {
    const inputCurrent = cipherMarker(markerIdx++);
    const inputOriginal =
      d.showOriginal && row.originalInputPrice !== null
        ? cipherMarker(markerIdx++)
        : undefined;
    const outputCurrent = cipherMarker(markerIdx++);
    const outputOriginal =
      d.showOriginal && row.originalOutputPrice !== null
        ? cipherMarker(markerIdx++)
        : undefined;
    const disc =
      d.showOriginal && row.originalInputPrice
        ? discount(row.originalInputPrice, row.inputPrice)
        : "";
    const discountM = disc ? cipherMarker(markerIdx++) : undefined;
    return {
      inputCurrent,
      inputOriginal,
      outputCurrent,
      outputOriginal,
      discountM,
      disc,
    };
  });

  const node = (
    <Card c={c} style={{ flexDirection: "column", padding: d.pad }}>
      <Row style={{ alignItems: "center", gap: 6 }}>
        <Brand
          c={c}
          logoSize={d.headerLogoSize}
          fontSize={d.headerFont}
          gap={6}
        />
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: d.headerFont,
            color: c.muted,
          }}
        >
          | {t(ctx.locale, "BADGE.SAVE_UP_TO")}
        </span>
        <MonoValue
          value={headerValue}
          c={c}
          size={d.headerFont}
          cipherMarker={headerMarker}
        />
      </Row>
      <Row
        style={{
          borderBottom: `1px solid ${c.border}`,
          padding: "10px 0",
          marginTop: 6,
        }}
      >
        <Label
          text={t(ctx.locale, "BADGE.MODEL")}
          c={c}
          size={10}
          style={{ width: d.modelWidth + d.iconSize + 6 }}
        />
        <Label
          text={t(ctx.locale, "BADGE.INPUT")}
          c={c}
          size={10}
          style={{ width: d.priceWidth }}
        />
        <Label
          text={t(ctx.locale, "BADGE.OUTPUT")}
          c={c}
          size={10}
          style={{ width: d.priceWidth }}
        />
      </Row>
      {displayRows.map((row, i) => (
        <PriceRow
          key={row.model}
          row={row}
          c={c}
          inputCurrentMarker={rowMarkers[i].inputCurrent}
          inputOriginalMarker={rowMarkers[i].inputOriginal}
          outputCurrentMarker={rowMarkers[i].outputCurrent}
          outputOriginalMarker={rowMarkers[i].outputOriginal}
          discountMarker={rowMarkers[i].discountM}
          showOriginal={d.showOriginal}
          modelWidth={d.modelWidth}
          priceWidth={d.priceWidth}
          iconSize={d.iconSize}
        />
      ))}
      {d.showOriginal && (
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: 9,
            color: c.muted,
            marginTop: 6,
          }}
        >
          * {t(ctx.locale, "BADGE.PRICES_NOTE")}
        </span>
      )}
    </Card>
  );

  // Build cipher targets
  const targets: CipherTarget[] = [
    {
      value: headerValue,
      fontSize: d.headerFont,
      color: c.text,
      markerColor: headerMarker,
    },
  ];

  for (let i = 0; i < displayRows.length; i++) {
    const row = displayRows[i];
    const rm = rowMarkers[i];

    targets.push({
      value: formatPrice(row.inputPrice),
      fontSize: 11,
      color: c.text,
      markerColor: rm.inputCurrent,
    });
    if (rm.inputOriginal && row.originalInputPrice !== null) {
      targets.push({
        value: formatPrice(row.originalInputPrice),
        fontSize: 8,
        color: c.muted,
        markerColor: rm.inputOriginal,
      });
    }
    targets.push({
      value: formatPrice(row.outputPrice),
      fontSize: 11,
      color: c.text,
      markerColor: rm.outputCurrent,
    });
    if (rm.outputOriginal && row.originalOutputPrice !== null) {
      targets.push({
        value: formatPrice(row.originalOutputPrice),
        fontSize: 8,
        color: c.muted,
        markerColor: rm.outputOriginal,
      });
    }
    if (rm.discountM && rm.disc) {
      targets.push({
        value: rm.disc,
        fontSize: 10,
        color: c.accent,
        markerColor: rm.discountM,
      });
    }
  }

  let svg = await renderBadge(node, d.W, d.H);
  svg = await processCipherMarkers(svg, targets);
  return svg;
}
