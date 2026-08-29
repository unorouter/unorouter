import type { PricingCatalogModel } from "@/openapi";
import { IconCell } from "../elements/feature-badge";
import { FONT_MONO, FONT_SANS } from "../elements/typography";
import { t } from "../lib/assets";
import type { BadgeCtx } from "../lib/types";
import { getVendorColorIcon, prepIconSvg } from "../lib/utils";
import { PriceStats, renderOgFrame } from "./model";

const W = 1200;
const PAD = 64;

function CompareSide(props: {
  ctx: BadgeCtx;
  model: PricingCatalogModel | null;
  requested: string;
}) {
  const model = props.model;
  const name = model?.model_name ?? props.requested;
  const vendorSvg = model ? getVendorColorIcon(model.vendor) : null;
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
        (model.is_free ? (
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
          <PriceStats
            ctx={props.ctx}
            model={model}
            gap={40}
            valueFont={30}
            labelFont={17}
          />
        ))}
    </div>
  );
}

export async function generateCompare(
  ctx: BadgeCtx,
  pair: { model: PricingCatalogModel | null; requested: string }[],
): Promise<string> {
  return renderOgFrame({
    ctx,
    focus: 50,
    children: (
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
    ),
  });
}
