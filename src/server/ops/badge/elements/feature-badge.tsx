/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import { env } from "@/lib/config/env";
import type { BadgeSize } from "@/lib/validation/badge";
import type { ReactNode } from "react";
import { bgSvg, RAINBOW } from "../lib/glow";
import type { BadgeCtx, BadgeDimsBase } from "../lib/types";
import { prepIconSvg, renderBadgeTemplate, svgDataUri } from "../lib/utils";
import { Logo } from "./primitives";
import { FONT_MONO, FONT_SANS, ShapedSpan } from "./typography";

const brandParts = env.appName!.split(/(?=[A-Z])/).filter(Boolean);

export interface FeatureBadgeDims extends BadgeDimsBase {
  logoSize: number;
  titleFont: number;
  taglineFont: number;
  showTagline: boolean;
  count: number;
  showLabels: boolean;
  cell: number;
  iconSize: number;
  labelFont: number;
  gap: number;
  vendorGrid?: {
    cols: number;
    rows: number;
    cell: number;
    icon: number;
    gap: number;
  };
  statFont?: number;
}

export const FEATURE_BADGE_DIMS: Record<BadgeSize, FeatureBadgeDims> = {
  xs: {
    W: 280,
    H: 120,
    pad: 14,
    logoSize: 20,
    titleFont: 14,
    taglineFont: 0,
    showTagline: false,
    count: 5,
    showLabels: false,
    cell: 30,
    iconSize: 18,
    labelFont: 0,
    gap: 6,
  },
  sm: {
    W: 360,
    H: 160,
    pad: 18,
    logoSize: 26,
    titleFont: 18,
    taglineFont: 0,
    showTagline: false,
    count: 6,
    showLabels: false,
    cell: 38,
    iconSize: 22,
    labelFont: 0,
    gap: 8,
  },
  md: {
    W: 440,
    H: 230,
    pad: 22,
    logoSize: 30,
    titleFont: 21,
    taglineFont: 12,
    showTagline: true,
    count: 6,
    showLabels: true,
    cell: 30,
    iconSize: 18,
    labelFont: 11,
    gap: 8,
  },
  lg: {
    W: 540,
    H: 280,
    pad: 28,
    logoSize: 36,
    titleFont: 25,
    taglineFont: 14,
    showTagline: true,
    count: 6,
    showLabels: true,
    cell: 38,
    iconSize: 22,
    labelFont: 13,
    gap: 9,
  },
  xl: {
    W: 660,
    H: 350,
    pad: 34,
    logoSize: 42,
    titleFont: 30,
    taglineFont: 16,
    showTagline: true,
    count: 8,
    showLabels: true,
    cell: 42,
    iconSize: 24,
    labelFont: 15,
    gap: 10,
  },
  og: {
    W: 1200,
    H: 630,
    pad: 56,
    logoSize: 76,
    titleFont: 56,
    taglineFont: 26,
    showTagline: true,
    count: 8,
    showLabels: true,
    cell: 60,
    iconSize: 34,
    labelFont: 23,
    gap: 16,
  },
};

export function lucide(inner: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">` +
    `<g fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>` +
    `</svg>`
  );
}

export function IconCell(props: {
  svg: string;
  cell: number;
  iconSize: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        width: props.cell,
        height: props.cell,
        borderRadius: Math.max(8, Math.round(props.cell * 0.22)),
        backgroundColor: "rgba(10,8,16,0.72)",
        border: "1px solid rgba(255,255,255,0.06)",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <img
        src={svgDataUri(props.svg)}
        width={props.iconSize}
        height={props.iconSize}
      />
    </div>
  );
}

export interface FeatureBadgeOpts {
  ctx: BadgeCtx;
  dims: Record<BadgeSize, FeatureBadgeDims>;
  suffix: string;
  tagline: string;
  features: { label: string; icon: string }[];
  vendorIcons?: string[];
  stat?: { value: string; label: string };
}

export async function renderFeatureBadge(
  opts: FeatureBadgeOpts,
): Promise<string> {
  const d = opts.dims[opts.ctx.size] ?? opts.dims.md;
  const features = opts.features.slice(0, d.count);

  const header = (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: Math.round(d.titleFont * 0.3),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: Math.round(d.titleFont * 0.4),
          }}
        >
          <Logo size={d.logoSize} />
          <div
            style={{
              display: "flex",
              fontFamily: FONT_SANS,
              fontSize: d.titleFont,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            <span style={{ color: "#ffffff" }}>
              {brandParts[0].toUpperCase()}
            </span>
            <span style={{ color: "#a7adb8" }}>
              {brandParts.slice(1).join("").toUpperCase()}
            </span>
            <span style={{ color: "#ffffff", marginLeft: "0.4em" }}>
              {opts.suffix}
            </span>
          </div>
        </div>
        {d.showTagline && (
          <ShapedSpan
            text={opts.tagline}
            fontSize={d.taglineFont}
            color="#9aa0a6"
            style={{ fontFamily: FONT_SANS }}
          />
        )}
      </div>
      {d.statFont && opts.stat && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: d.statFont,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {opts.stat.value}
          </span>
          <ShapedSpan
            text={opts.stat.label}
            fontSize={d.taglineFont}
            color="#9aa0a6"
            style={{ fontFamily: FONT_SANS }}
          />
        </div>
      )}
    </div>
  );

  const vg = d.vendorGrid;
  const vendorW = vg ? vg.cols * vg.cell + (vg.cols - 1) * vg.gap : 0;
  const contentW = d.W - d.pad * 2;
  const featuresW = vg ? contentW - vendorW - 44 : contentW;

  let grid: ReactNode;
  if (d.showLabels) {
    const chipW = Math.floor((featuresW - d.gap) / 2);
    grid = (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          width: featuresW,
          gap: d.gap,
        }}
      >
        {features.map((f) => (
          <div
            key={f.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: Math.round(d.cell * 0.3),
              width: chipW,
            }}
          >
            <IconCell svg={f.icon} cell={d.cell} iconSize={d.iconSize} />
            <ShapedSpan
              text={f.label}
              fontSize={d.labelFont}
              color="#e8eaed"
              style={{
                fontFamily: FONT_SANS,
                maxWidth: chipW - d.cell - Math.round(d.cell * 0.3),
              }}
            />
          </div>
        ))}
      </div>
    );
  } else {
    grid = (
      <div style={{ display: "flex", gap: d.gap, alignItems: "center" }}>
        {features.map((f) => (
          <IconCell
            key={f.label}
            svg={f.icon}
            cell={d.cell}
            iconSize={d.iconSize}
          />
        ))}
      </div>
    );
  }

  let vendorGrid: ReactNode = null;
  if (vg && opts.vendorIcons) {
    const vendorIcons = opts.vendorIcons.slice(0, vg.cols * vg.rows);
    vendorGrid = (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          width: vendorW,
          gap: vg.gap,
          transform: "rotate(-9deg)",
          alignContent: "center",
          justifyContent: "center",
        }}
      >
        {vendorIcons.map((svg, i) => (
          <IconCell
            key={i}
            svg={prepIconSvg(svg)}
            cell={vg.cell}
            iconSize={vg.icon}
          />
        ))}
      </div>
    );
  }

  const rainbowH = 1;
  const node = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: d.W,
        height: d.H,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: d.W,
          height: d.H - rainbowH,
          padding: `${d.pad}px ${d.pad}px ${Math.round(d.pad * 0.75)}px`,
          justifyContent: "space-between",
        }}
      >
        {header}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: d.showLabels
              ? vendorGrid
                ? "space-between"
                : "flex-start"
              : "center",
            paddingTop: Math.round(d.pad * 0.5),
          }}
        >
          {grid}
          {vendorGrid}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          width: d.W,
          height: rainbowH,
          backgroundImage: RAINBOW,
        }}
      />
    </div>
  );

  return renderBadgeTemplate({
    node,
    width: d.W,
    height: d.H,
    svgBackground: bgSvg(
      d.W,
      d.H,
      d.showLabels ? 58 : 50,
      d.showLabels ? 0.7 : 0.55,
      d.showLabels ? "grid" : "strip",
    ),
    staticMode: opts.ctx.staticMode,
  });
}
