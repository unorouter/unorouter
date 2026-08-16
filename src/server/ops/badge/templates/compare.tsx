import type { ProcessedModel } from "@/lib/api/pricing";
import { IconCell } from "../elements/feature-badge";
import { Brand } from "../elements/primitives";
import { FONT_MONO, FONT_SANS } from "../elements/typography";
import { t } from "../lib/assets";
import { bgSvg, RAINBOW } from "../lib/glow";
import { THEME_COLORS } from "../lib/theme";
import type { BadgeCtx } from "../lib/types";
import {
  getVendorColorIcon,
  prepIconSvg,
  renderBadgeTemplate,
} from "../lib/utils";
import { fmtPrice, ModelStat } from "./model";

const W = 1200;
const H = 630;
const PAD = 64;

function CompareSide(props: {
  ctx: BadgeCtx;
  model: ProcessedModel | null;
  requested: string;
}) {
  const model = props.model;
  const name = model?.name ?? props.requested;
  const vendorSvg = model ? getVendorColorIcon(model.vendor.name) : null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        width: (W - PAD * 2 - 160) / 2,
      }}
    >
      {vendorSvg && (
        <IconCell svg={prepIconSvg(vendorSvg)} cell={132} iconSize={76} />
      )}
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: name.length > 24 ? 30 : 38,
          fontWeight: 700,
          color: "#ffffff",
          textAlign: "center",
        }}
      >
        {name}
      </span>
      {model &&
        (model.isFree ? (
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 30,
              fontWeight: 700,
              color: "#46d36a",
            }}
          >
            {t(props.ctx.locale, "BADGE.FREE").toUpperCase()}
          </span>
        ) : (
          <div style={{ display: "flex", gap: 40 }}>
            <ModelStat
              value={fmtPrice(
                model.isFixedPrice ? model.fixedPrice : model.inputPrice,
              )}
              label={t(
                props.ctx.locale,
                model.isFixedPrice ? "BADGE.MODEL" : "BADGE.INPUT",
              )}
              valueFont={30}
              labelFont={17}
            />
            {!model.isFixedPrice && (
              <ModelStat
                value={fmtPrice(model.outputPrice)}
                label={t(props.ctx.locale, "BADGE.OUTPUT")}
                valueFont={30}
                labelFont={17}
              />
            )}
          </div>
        ))}
    </div>
  );
}

export async function generateCompare(
  ctx: BadgeCtx,
  pair: { model: ProcessedModel | null; requested: string }[],
): Promise<string> {
  const c = THEME_COLORS.dark;

  const node = (
    <div
      style={{ display: "flex", flexDirection: "column", width: W, height: H }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: W,
          height: H - 1,
          padding: `${PAD}px ${PAD}px ${Math.round(PAD * 0.75)}px`,
        }}
      >
        <Brand c={c} logoSize={64} fontSize={40} />
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <CompareSide
            ctx={ctx}
            model={pair[0]?.model ?? null}
            requested={pair[0]?.requested ?? ""}
          />
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 52,
              fontWeight: 700,
              color: "#9aa0a6",
            }}
          >
            VS
          </span>
          <CompareSide
            ctx={ctx}
            model={pair[1]?.model ?? null}
            requested={pair[1]?.requested ?? ""}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          width: W,
          height: 1,
          backgroundImage: RAINBOW,
        }}
      />
    </div>
  );

  return renderBadgeTemplate({
    node,
    width: W,
    height: H,
    svgBackground: bgSvg(W, H, 50, 0.7, "grid"),
    staticMode: ctx.staticMode,
  });
}
