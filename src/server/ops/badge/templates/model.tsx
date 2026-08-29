import type { PricingCatalogModel } from "@/openapi";
import type { ReactNode } from "react";
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

const W = 1200;
const H = 630;
const PAD = 64;

export function fmtPrice(p: number): string {
  if (p === 0) return "$0";
  if (p < 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(2)}`;
}

export function fmtContext(tokens: number): string {
  if (tokens >= 1_000_000) return `${Math.round(tokens / 1_000_000)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}

export function ModelStat(props: {
  value: string;
  label: string;
  valueColor?: string;
  valueFont?: number;
  labelFont?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: props.valueFont ?? 40,
          fontWeight: 700,
          color: props.valueColor ?? "#ffffff",
        }}
      >
        {props.value}
      </span>
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: props.labelFont ?? 20,
          color: "#9aa0a6",
        }}
      >
        {props.label}
      </span>
    </div>
  );
}

export function PriceStats(props: {
  ctx: BadgeCtx;
  model: PricingCatalogModel;
  gap: number;
  valueFont?: number;
  labelFont?: number;
}) {
  const model = props.model;
  return (
    <div style={{ display: "flex", gap: props.gap }}>
      <ModelStat
        value={fmtPrice(
          model.is_fixed_price ? model.fixed_price : model.input_price,
        )}
        label={t(
          props.ctx.locale,
          model.is_fixed_price ? "BADGE.MODEL" : "BADGE.INPUT",
        )}
        valueFont={props.valueFont}
        labelFont={props.labelFont}
      />
      {!model.is_fixed_price && (
        <ModelStat
          value={fmtPrice(model.output_price)}
          label={t(props.ctx.locale, "BADGE.OUTPUT")}
          valueFont={props.valueFont}
          labelFont={props.labelFont}
        />
      )}
    </div>
  );
}

export async function renderOgFrame(opts: {
  ctx: BadgeCtx;
  focus: number;
  justifyBetween?: boolean;
  children: ReactNode;
}): Promise<string> {
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
          ...(opts.justifyBetween && { justifyContent: "space-between" }),
        }}
      >
        <Brand c={THEME_COLORS.dark} logoSize={64} fontSize={40} />
        {opts.children}
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
    svgBackground: bgSvg(W, H, opts.focus, 0.7, "grid"),
    staticMode: opts.ctx.staticMode,
  });
}

export async function generateModel(
  ctx: BadgeCtx,
  model: PricingCatalogModel | null,
  requested: string,
): Promise<string> {
  const name = model?.model_name ?? requested;
  const vendorSvg = model ? getVendorColorIcon(model.vendor) : null;
  const contextWindow = model?.metadata?.contextWindow;

  const stats = model ? (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        width: W - PAD * 2,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {model.is_free ? (
          <ModelStat
            value={t(ctx.locale, "BADGE.FREE").toUpperCase()}
            label={t(ctx.locale, "BADGE.PRICES_NOTE")}
            valueColor="#46d36a"
          />
        ) : (
          <PriceStats ctx={ctx} model={model} gap={64} />
        )}
        {!model.is_free && (
          <span
            style={{ fontFamily: FONT_SANS, fontSize: 18, color: "#9aa0a6" }}
          >
            {t(ctx.locale, "BADGE.PRICES_NOTE")}
          </span>
        )}
      </div>
      {contextWindow && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 40,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {fmtContext(contextWindow)}
          </span>
          <span
            style={{ fontFamily: FONT_SANS, fontSize: 20, color: "#9aa0a6" }}
          >
            {t(ctx.locale, "BADGE.CONTEXT")}
          </span>
        </div>
      )}
    </div>
  ) : null;

  return renderOgFrame({
    ctx,
    focus: 60,
    justifyBetween: true,
    children: (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {vendorSvg && (
            <IconCell svg={prepIconSvg(vendorSvg)} cell={168} iconSize={96} />
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxWidth: W - PAD * 2 - 220,
            }}
          >
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: name.length > 28 ? 44 : 60,
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              {name}
            </span>
            {model && (
              <span
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  color: "#9aa0a6",
                }}
              >
                {model.vendor}
              </span>
            )}
          </div>
        </div>
        {stats}
      </>
    ),
  });
}
