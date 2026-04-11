import { SQUARE_DIMS, resolveDims } from "../lib/config";
import { t } from "../i18n";
import { formatCompact } from "../lib/format";
import { Card, Logo, BrandName } from "../lib/primitives";
import { renderBadge } from "../lib/render";
import { themeVars } from "../lib/theme";
import { MonoValue, Label } from "../lib/typography";
import type { BadgeCtx } from "../route";
import { cipherMarker, processCipherMarkers, pulseDot } from "./cipher";

export async function generateTokensSquare(ctx: BadgeCtx): Promise<string> {
  const c = themeVars(ctx.theme);
  const d = resolveDims(SQUARE_DIMS, ctx.size);
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

  let svg = await renderBadge(
    node,
    d.W,
    d.H,
    pulseDot(d.W / 2, d.dotY, d.dotR, c.accent),
  );
  svg = await processCipherMarkers(svg, [
    { value, fontSize: d.valueSize, color: c.text, markerColor: m1 },
  ]);
  return svg;
}
