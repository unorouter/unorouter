import { BANNER_DIMS, resolveDims } from "../lib/config";
import { t } from "../i18n";
import { formatFull } from "../lib/format";
import { Card, Brand, Divider, Row } from "../lib/primitives";
import { renderBadge } from "../lib/render";
import { themeVars } from "../lib/theme";
import { Stat } from "../lib/typography";
import type { BadgeCtx } from "../route";
import {
  cipherMarker,
  processCipherMarkers,
  replacePulseDotMarker,
} from "./cipher";

export async function generateTokensBanner(ctx: BadgeCtx): Promise<string> {
  const c = themeVars(ctx.theme);
  const d = resolveDims(BANNER_DIMS, ctx.size);
  const tokenCount = formatFull(ctx.stats.tokenUsed);
  const marker1 = cipherMarker(1);

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
        cipherMarker={marker1}
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

  let svg = await renderBadge(node, d.W, d.H);
  svg = replacePulseDotMarker(svg, c.pulseDotMarker, c.accent);
  svg = await processCipherMarkers(svg, [
    {
      value: tokenCount,
      fontSize: d.statSize,
      color: c.text,
      markerColor: marker1,
      loop: true,
    },
  ]);
  return svg;
}
