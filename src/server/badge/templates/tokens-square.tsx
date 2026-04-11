import type { BadgeSize } from "@/lib/validation/badge";
import { t } from "../i18n";
import {
  type BadgeCtx,
  type BadgeDimsBase,
  resolveDims,
  formatCompact,
  themeVars,
  cipherMarker,
  pulseDot,
  renderBadgeTemplate,
  Card,
  Logo,
  BrandName,
  MonoValue,
  Label,
} from "../lib";

interface Dims extends BadgeDimsBase {
  logo: number;
  brandFont: number;
  valueSize: number;
  labelSize: number;
  gap: number;
  radius: number;
  dotR: number;
  dotY: number;
}

const DIMS: Partial<Record<BadgeSize, Dims>> = {
  xs: {
    W: 110,
    H: 110,
    pad: 10,
    logo: 28,
    brandFont: 8,
    valueSize: 12,
    labelSize: 7,
    gap: 4,
    radius: 10,
    dotR: 1.5,
    dotY: 96,
  },
  sm: {
    W: 140,
    H: 140,
    pad: 14,
    logo: 36,
    brandFont: 10,
    valueSize: 16,
    labelSize: 8,
    gap: 5,
    radius: 12,
    dotR: 2,
    dotY: 124,
  },
  md: {
    W: 176,
    H: 176,
    pad: 20,
    logo: 48,
    brandFont: 12,
    valueSize: 20,
    labelSize: 9,
    gap: 7,
    radius: 14,
    dotR: 2.5,
    dotY: 156,
  },
  lg: {
    W: 220,
    H: 220,
    pad: 26,
    logo: 60,
    brandFont: 15,
    valueSize: 26,
    labelSize: 11,
    gap: 9,
    radius: 16,
    dotR: 3,
    dotY: 196,
  },
  xl: {
    W: 280,
    H: 280,
    pad: 34,
    logo: 76,
    brandFont: 19,
    valueSize: 34,
    labelSize: 14,
    gap: 12,
    radius: 18,
    dotR: 4,
    dotY: 250,
  },
};

export async function generateTokensSquare(ctx: BadgeCtx): Promise<string> {
  const c = themeVars(ctx.theme);
  const d = resolveDims(DIMS, ctx.size);
  const value = formatCompact(ctx.stats.tokenUsed);
  const m1 = cipherMarker(1);

  const node = (
    <Card
      c={c}
      radius={d.radius}
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: d.gap,
        padding: `${d.pad}px 0`,
      }}
    >
      <Logo size={d.logo} />
      <BrandName c={c} size={d.brandFont} />
      <MonoValue value={value} c={c} size={d.valueSize} cipherMarker={m1} />
      <Label
        text={t(ctx.locale, "BADGE.TOKENS_SERVED")}
        c={c}
        size={d.labelSize}
      />
    </Card>
  );

  return renderBadgeTemplate({
    node,
    width: d.W,
    height: d.H,
    smil: pulseDot(d.W / 2, d.dotY, d.dotR, c.accent),
    cipherTargets: [
      { value, fontSize: d.valueSize, color: c.text, markerColor: m1 },
    ],
  });
}
