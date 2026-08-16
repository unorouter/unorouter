import type { BadgeSize } from "@/lib/validation/badge";
import { makeCipher } from "../elements/cipher";
import { Brand, Card, Divider, PulseDotMarker } from "../elements/primitives";
import { Stat } from "../elements/typography";
import { t } from "../lib/cache";
import { THEME_COLORS } from "../lib/theme";
import type { BadgeCtx, BadgeDimsBase } from "../lib/types";
import { renderBadgeTemplate } from "../lib/utils";

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
  og: {
    W: 1200,
    H: 630,
    pad: 80,
    logoSize: 200,
    brandFont: 96,
    brandGap: 48,
    statSize: 110,
    labelSize: 44,
    divMargin: "0 72px",
    dotSize: 24,
  },
};

export async function generateTokensBanner(ctx: BadgeCtx): Promise<string> {
  const c = THEME_COLORS[ctx.theme];
  const d = DIMS[ctx.size]!;
  const tokenCount = ctx.stats.tokenUsed.toLocaleString("en-US");
  const cip = makeCipher();
  const m1 = cip.mark(tokenCount, d.statSize, c.text, true);
  const isOg = ctx.size === "og";

  const node = isOg ? (
    <Card
      c={c}
      radius={24}
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 56,
        padding: d.pad,
      }}
    >
      <Brand
        c={c}
        logoSize={d.logoSize}
        fontSize={d.brandFont}
        gap={d.brandGap}
      />
      <Stat
        value={tokenCount}
        label={t(ctx.locale, "BADGE.TOKENS_SERVED")}
        c={c}
        size={d.statSize}
        labelSize={d.labelSize}
        cipherMarker={m1}
      />
      <PulseDotMarker size={d.dotSize} c={c} />
    </Card>
  ) : (
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
      <PulseDotMarker size={d.dotSize} c={c} style={{ marginLeft: "auto" }} />
    </Card>
  );

  return renderBadgeTemplate({
    node,
    width: d.W,
    height: d.H,
    pulseDot: { markerColor: c.pulseDotMarker, accentColor: c.accent },
    cipherTargets: cip.targets,
    staticMode: ctx.staticMode,
  });
}
