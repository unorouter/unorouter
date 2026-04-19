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
  xs: { W: 180, H: 40, pad: 10, logoSize: 20, brandFont: 11, brandGap: 6 },
  sm: { W: 230, H: 52, pad: 12, logoSize: 26, brandFont: 14, brandGap: 8 },
  md: { W: 280, H: 64, pad: 14, logoSize: 32, brandFont: 17, brandGap: 10 },
  lg: { W: 340, H: 76, pad: 16, logoSize: 40, brandFont: 21, brandGap: 12 },
  xl: { W: 400, H: 90, pad: 18, logoSize: 48, brandFont: 25, brandGap: 14 },
  og: { W: 1200, H: 300, pad: 40, logoSize: 140, brandFont: 72, brandGap: 32 },
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
