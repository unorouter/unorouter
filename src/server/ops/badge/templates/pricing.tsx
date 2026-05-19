/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import { formatPrice } from "@/lib/utils/format/number";
import type { BadgeSize } from "@/lib/validation/badge";
import { cipherMarker } from "../elements/cipher";
import { Brand, Card, Row } from "../elements/primitives";
import { FONT_MONO, FONT_SANS, Label, MonoValue } from "../elements/typography";
import { t } from "../lib/cache";
import { renderBadgeTemplate } from "../lib/utils";
import { THEME_COLORS } from "../lib/theme";
import type {
  BadgeCtx,
  BadgeDimsBase,
  BadgePricingRow,
  CipherTarget,
  ThemeColors,
} from "../lib/types";
import { computeSize, discount, getVendorIcon, svgDataUri } from "../lib/utils";

export interface Dims extends BadgeDimsBase {
  showOriginal: boolean;
  modelWidth: number;
  priceWidth: number;
  discountWidth: number;
  iconSize: number;
  maxRows: number;
  rowHeight: number;
  headerLogoSize: number;
  headerFont: number;
  modelFont: number;
  priceFont: number;
  origFont: number;
  labelFont: number;
  discountFont: number;
  noteFont: number;
}

const DIMS: Partial<Record<BadgeSize, Dims>> = {
  xs: {
    W: 0,
    H: 0,
    pad: 14,
    showOriginal: false,
    modelWidth: 110,
    priceWidth: 65,
    discountWidth: 0,
    iconSize: 10,
    maxRows: 3,
    rowHeight: 30,
    headerLogoSize: 16,
    headerFont: 10,
    modelFont: 10,
    priceFont: 11,
    origFont: 8,
    labelFont: 9,
    discountFont: 9,
    noteFont: 8,
  },
  sm: {
    W: 0,
    H: 0,
    pad: 18,
    showOriginal: false,
    modelWidth: 130,
    priceWidth: 80,
    discountWidth: 0,
    iconSize: 11,
    maxRows: 3,
    rowHeight: 32,
    headerLogoSize: 18,
    headerFont: 11,
    modelFont: 11,
    priceFont: 12,
    origFont: 9,
    labelFont: 9,
    discountFont: 10,
    noteFont: 9,
  },
  md: {
    W: 0,
    H: 0,
    pad: 24,
    showOriginal: true,
    modelWidth: 140,
    priceWidth: 88,
    discountWidth: 60,
    iconSize: 14,
    maxRows: 99,
    rowHeight: 40,
    headerLogoSize: 22,
    headerFont: 14,
    modelFont: 13,
    priceFont: 14,
    origFont: 10,
    labelFont: 11,
    discountFont: 11,
    noteFont: 10,
  },
  lg: {
    W: 0,
    H: 0,
    pad: 32,
    showOriginal: true,
    modelWidth: 180,
    priceWidth: 110,
    discountWidth: 72,
    iconSize: 18,
    maxRows: 99,
    rowHeight: 48,
    headerLogoSize: 28,
    headerFont: 17,
    modelFont: 16,
    priceFont: 17,
    origFont: 12,
    labelFont: 13,
    discountFont: 13,
    noteFont: 12,
  },
  xl: {
    W: 0,
    H: 0,
    pad: 40,
    showOriginal: true,
    modelWidth: 220,
    priceWidth: 140,
    discountWidth: 90,
    iconSize: 22,
    maxRows: 99,
    rowHeight: 56,
    headerLogoSize: 34,
    headerFont: 21,
    modelFont: 19,
    priceFont: 21,
    origFont: 14,
    labelFont: 15,
    discountFont: 15,
    noteFont: 14,
  },
  og: {
    W: 1200,
    H: 630,
    pad: 56,
    showOriginal: true,
    modelWidth: 460,
    priceWidth: 190,
    discountWidth: 120,
    iconSize: 32,
    maxRows: 5,
    rowHeight: 68,
    headerLogoSize: 56,
    headerFont: 34,
    modelFont: 26,
    priceFont: 28,
    origFont: 18,
    labelFont: 22,
    discountFont: 22,
    noteFont: 18,
  },
};

function PriceCell(props: {
  original: number | null;
  current: number;
  c: ThemeColors;
  width: number;
  currentMarker: string;
  originalMarker?: string;
  showOriginal: boolean;
  priceFont: number;
  origFont: number;
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
            fontSize: props.origFont,
            color: props.originalMarker ?? props.c.muted,
            textDecoration: "line-through",
          }}
        >
          {formatPrice(props.original)}
        </span>
      ) : props.showOriginal ? (
        <span style={{ fontSize: props.origFont }}> </span>
      ) : null}
      <MonoValue
        value={formatPrice(props.current)}
        c={props.c}
        size={props.priceFont}
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
  modelFont: number;
  priceFont: number;
  origFont: number;
  discountFont: number;
}) {
  const disc =
    props.showOriginal && props.row.originalInputPrice
      ? discount(props.row.originalInputPrice, props.row.inputPrice)
      : "";
  const iconSvg = getVendorIcon(props.row.vendor);

  return (
    <Row style={{ alignItems: "center", padding: "6px 0" }}>
      {iconSvg && (
        <img
          src={svgDataUri(iconSvg, props.c.text)}
          width={props.iconSize}
          height={props.iconSize}
          style={{ marginRight: 6 }}
        />
      )}
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: props.modelFont,
          color: props.c.text,
          width: props.modelWidth,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {props.row.model}
      </span>
      <PriceCell
        original={props.row.originalInputPrice}
        current={props.row.inputPrice}
        c={props.c}
        width={props.priceWidth}
        currentMarker={props.inputCurrentMarker}
        originalMarker={props.inputOriginalMarker}
        showOriginal={props.showOriginal}
        priceFont={props.priceFont}
        origFont={props.origFont}
      />
      <PriceCell
        original={props.row.originalOutputPrice}
        current={props.row.outputPrice}
        c={props.c}
        width={props.priceWidth}
        currentMarker={props.outputCurrentMarker}
        originalMarker={props.outputOriginalMarker}
        showOriginal={props.showOriginal}
        priceFont={props.priceFont}
        origFont={props.origFont}
      />
      {disc ? (
        <Row
          style={{
            backgroundColor: props.c.accentMuted,
            borderRadius: 4,
            padding: "2px 6px",
          }}
        >
          <MonoValue
            value={disc}
            c={{ ...props.c, text: props.c.accent }}
            size={props.discountFont}
            cipherMarker={props.discountMarker}
          />
        </Row>
      ) : null}
    </Row>
  );
}

export async function generatePricing(ctx: BadgeCtx): Promise<string> {
  const c = THEME_COLORS[ctx.theme];
  const d = DIMS[ctx.size]!;
  const displayRows = ctx.pricing.rows.slice(0, d.maxRows);
  const size =
    d.W > 0 && d.H > 0
      ? { W: d.W, H: d.H }
      : computeSize(d, displayRows.length);

  const maxDiscount = ctx.pricing.rows.reduce((max, r) => {
    if (!r.originalInputPrice) return max;
    const pct = Math.round((1 - r.inputPrice / r.originalInputPrice) * 100);
    return pct > max ? pct : max;
  }, 0);

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
          size={d.labelFont}
          style={{ width: d.modelWidth + d.iconSize + 6 }}
        />
        <Label
          text={t(ctx.locale, "BADGE.INPUT")}
          c={c}
          size={d.labelFont}
          style={{ width: d.priceWidth }}
        />
        <Label
          text={t(ctx.locale, "BADGE.OUTPUT")}
          c={c}
          size={d.labelFont}
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
          modelFont={d.modelFont}
          priceFont={d.priceFont}
          origFont={d.origFont}
          discountFont={d.discountFont}
        />
      ))}
      {d.showOriginal && (
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: d.noteFont,
            color: c.muted,
            marginTop: 6,
          }}
        >
          * {t(ctx.locale, "BADGE.PRICES_NOTE")}
        </span>
      )}
    </Card>
  );

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
      fontSize: d.priceFont,
      color: c.text,
      markerColor: rm.inputCurrent,
    });
    if (rm.inputOriginal && row.originalInputPrice !== null)
      targets.push({
        value: formatPrice(row.originalInputPrice),
        fontSize: d.origFont,
        color: c.muted,
        markerColor: rm.inputOriginal,
      });
    targets.push({
      value: formatPrice(row.outputPrice),
      fontSize: d.priceFont,
      color: c.text,
      markerColor: rm.outputCurrent,
    });
    if (rm.outputOriginal && row.originalOutputPrice !== null)
      targets.push({
        value: formatPrice(row.originalOutputPrice),
        fontSize: d.origFont,
        color: c.muted,
        markerColor: rm.outputOriginal,
      });
    if (rm.discountM && rm.disc)
      targets.push({
        value: rm.disc,
        fontSize: d.discountFont,
        color: c.accent,
        markerColor: rm.discountM,
      });
  }

  return renderBadgeTemplate({
    node,
    width: size.W,
    height: size.H,
    cipherTargets: targets,
    staticMode: ctx.staticMode,
  });
}
