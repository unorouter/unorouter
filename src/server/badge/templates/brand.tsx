import type { BadgeSize } from "@/lib/validation/badge";
import { Brand, Card } from "../elements/primitives";
import { THEME_COLORS } from "../lib/theme";
import type { BadgeCtx, BadgeDimsBase } from "../lib/types";
import { renderBadgeTemplate } from "../lib/utils";

interface Dims extends BadgeDimsBase {
  logoSize: number;
  brandFont: number;
  brandGap: number;
}

const DIMS: Record<BadgeSize, Dims> = {
  xs: { W: 200, H: 60, pad: 12, logoSize: 20, brandFont: 11, brandGap: 6 },
  sm: { W: 260, H: 80, pad: 16, logoSize: 26, brandFont: 14, brandGap: 8 },
  md: { W: 320, H: 100, pad: 20, logoSize: 32, brandFont: 17, brandGap: 10 },
  lg: { W: 400, H: 120, pad: 24, logoSize: 40, brandFont: 21, brandGap: 12 },
  xl: { W: 480, H: 140, pad: 28, logoSize: 48, brandFont: 25, brandGap: 14 },
  og: { W: 1200, H: 630, pad: 56, logoSize: 140, brandFont: 72, brandGap: 32 },
};

export async function generateBrand(ctx: BadgeCtx): Promise<string> {
  const c = THEME_COLORS[ctx.theme];
  const d = DIMS[ctx.size];

  const node = (
    <Card
      c={c}
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: d.pad,
      }}
    >
      <Brand
        c={c}
        logoSize={d.logoSize}
        fontSize={d.brandFont}
        gap={d.brandGap}
      />
    </Card>
  );

  return renderBadgeTemplate({
    node,
    width: d.W,
    height: d.H,
    staticMode: ctx.staticMode,
  });
}
