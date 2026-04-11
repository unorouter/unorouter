import type { BadgeSize } from "@/lib/validation/badge";
import { Stat } from "../elements/typography";
import { cipherMarker } from "../elements/cipher";
import { t } from "../lib/i18n";
import { Brand, Card, Divider, Row } from "../elements/primitives";
import { renderBadgeTemplate } from "../lib/render";
import { themeVars } from "../lib/theme";
import type { BadgeCtx, BadgeDimsBase } from "../lib/types";
import { formatFull, resolveDims } from "../lib/utils";

interface Dims extends BadgeDimsBase {
  logoSize: number;
  brandFont: number;
  brandGap: number;
  statSize: number;
  labelSize: number;
  divMargin: string;
  dotSize: number;
}

const DIMS: Partial<Record<BadgeSize, Dims>> = {
  xs: {
    W: 300,
    H: 65,
    pad: 10,
    logoSize: 20,
    brandFont: 9,
    brandGap: 6,
    statSize: 13,
    labelSize: 7,
    divMargin: "0 8px",
    dotSize: 5,
  },
  sm: {
    W: 380,
    H: 80,
    pad: 14,
    logoSize: 26,
    brandFont: 11,
    brandGap: 8,
    statSize: 16,
    labelSize: 9,
    divMargin: "0 12px",
    dotSize: 6,
  },
  md: {
    W: 500,
    H: 105,
    pad: 20,
    logoSize: 34,
    brandFont: 14,
    brandGap: 10,
    statSize: 19,
    labelSize: 10,
    divMargin: "0 18px",
    dotSize: 7,
  },
  lg: {
    W: 620,
    H: 130,
    pad: 26,
    logoSize: 42,
    brandFont: 17,
    brandGap: 12,
    statSize: 24,
    labelSize: 12,
    divMargin: "0 22px",
    dotSize: 8,
  },
  xl: {
    W: 760,
    H: 160,
    pad: 32,
    logoSize: 52,
    brandFont: 21,
    brandGap: 14,
    statSize: 30,
    labelSize: 14,
    divMargin: "0 28px",
    dotSize: 10,
  },
};

export async function generateTokensBanner(ctx: BadgeCtx): Promise<string> {
  const c = themeVars(ctx.theme);
  const d = resolveDims(DIMS, ctx.size);
  const tokenCount = formatFull(ctx.stats.tokenUsed);
  const m1 = cipherMarker(1);

  const node = (
    <Card c={c} style={{ alignItems: "center", padding: `0 ${d.pad}px` }}>
      <Brand
        c={c}
        logoSize={d.logoSize}
        fontSize={d.brandFont}
        gap={d.brandGap}
      />
      <Divider c={c} margin={d.divMargin} />
      <Stat
        value={tokenCount}
        label={t(ctx.locale, "BADGE.TOKENS_SERVED")}
        c={c}
        size={d.statSize}
        labelSize={d.labelSize}
        cipherMarker={m1}
      />
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
    ],
  });
}
