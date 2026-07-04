/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import { env } from "@/lib/config/env";
import type { BadgeSize } from "@/lib/validation/badge";
import type { ReactNode } from "react";
import { Logo } from "../elements/primitives";
import { FONT_MONO, FONT_SANS } from "../elements/typography";
import { t } from "../lib/cache";
import { bgSvg, RAINBOW } from "../lib/glow";
import type { BadgeCtx, BadgeDimsBase } from "../lib/types";
import {
  getVendorColorIcon,
  POPULAR_VENDORS,
  prepIconSvg,
  renderBadgeTemplate,
  svgDataUri,
} from "../lib/utils";

const brandParts = env.appName!.split(/(?=[A-Z])/).filter(Boolean);

interface Dims extends BadgeDimsBase {
  logoSize: number;
  titleFont: number;
  taglineFont: number;
  showTagline: boolean;
  // Feature chips: labeled two-column grid on md+, icon-only row on xs/sm.
  count: number;
  showLabels: boolean;
  cell: number;
  iconSize: number;
  labelFont: number;
  gap: number;
  // og-only extras: tilted vendor-icon grid on the right + model-count stat in the header.
  vendorGrid?: {
    cols: number;
    rows: number;
    cell: number;
    icon: number;
    gap: number;
  };
  statFont?: number;
}

const DIMS: Record<BadgeSize, Dims> = {
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
    count: 10,
    showLabels: true,
    cell: 60,
    iconSize: 34,
    labelFont: 23,
    gap: 16,
    vendorGrid: { cols: 3, rows: 3, cell: 96, icon: 52, gap: 14 },
    statFont: 44,
  },
};

// Lucide outline geometry. Stroke lives on the inner <g> (not the root tag) so the PNG path's svg-inliner keeps it when it drops the root <svg>.
function lucide(inner: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">` +
    `<g fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>` +
    `</svg>`
  );
}

// Ordered by marketing priority: each size renders the first `count` entries.
const FEATURES: { key: string; icon: string }[] = [
  {
    key: "BADGE.CHAT_CHARACTERS",
    // venetian-mask
    icon: lucide(
      `<path d="M18 11c-1.5 0-2.5.5-3 2"/><path d="M4 6a2 2 0 0 0-2 2v4a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V8a2 2 0 0 0-2-2h-3a8 8 0 0 0-5 2 8 8 0 0 0-5-2z"/><path d="M6 11c1.5 0 2.5.5 3 2"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_LOREBOOKS",
    // book-marked
    icon: lucide(
      `<path d="M10 2v8l3-3 3 3V2"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_FREE_BYOK",
    // key-round
    icon: lucide(
      `<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="#ffffff"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_IMPORT_EXPORT",
    // arrow-down-up
    icon: lucide(
      `<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_IMAGE_GEN",
    // image-plus
    icon: lucide(
      `<path d="M16 5h6"/><path d="M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_MEMORY",
    // brain
    icon: lucide(
      `<path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_SCRIPTING",
    // code-xml
    icon: lucide(
      `<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_GROUP_CHATS",
    // users
    icon: lucide(
      `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_PERSONAS",
    // id-card
    icon: lucide(
      `<path d="M16 10h2"/><path d="M16 14h2"/><path d="M6.17 15a3 3 0 0 1 5.66 0"/><circle cx="9" cy="11" r="2"/><rect x="2" y="5" width="20" height="14" rx="2"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_BRANCHES",
    // git-branch
    icon: lucide(
      `<path d="M15 6a9 9 0 0 0-9 9V3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>`,
    ),
  },
];

function IconCell(props: { svg: string; cell: number; iconSize: number }) {
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

export async function generateChat(ctx: BadgeCtx): Promise<string> {
  const d = DIMS[ctx.size] ?? DIMS.md;
  const features = FEATURES.slice(0, d.count);

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
            <span style={{ color: "#ffffff", marginLeft: "0.4em" }}>CHAT</span>
          </div>
        </div>
        {d.showTagline && (
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: d.taglineFont,
              color: "#9aa0a6",
            }}
          >
            {t(ctx.locale, "BADGE.CHAT_TAGLINE")}
          </span>
        )}
      </div>
      {d.statFont && (
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
            {ctx.pricing.modelCount}+
          </span>
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: d.taglineFont,
              color: "#9aa0a6",
            }}
          >
            {t(ctx.locale, "BADGE.MODELS")}
          </span>
        </div>
      )}
    </div>
  );

  // Right-side tilted vendor grid reserves width on og; feature chips split the rest.
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
            key={f.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: Math.round(d.cell * 0.3),
              width: chipW,
            }}
          >
            <IconCell svg={f.icon} cell={d.cell} iconSize={d.iconSize} />
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: d.labelFont,
                color: "#e8eaed",
                maxWidth: chipW - d.cell - Math.round(d.cell * 0.3),
              }}
            >
              {t(ctx.locale, f.key)}
            </span>
          </div>
        ))}
      </div>
    );
  } else {
    grid = (
      <div style={{ display: "flex", gap: d.gap, alignItems: "center" }}>
        {features.map((f) => (
          <IconCell
            key={f.key}
            svg={f.icon}
            cell={d.cell}
            iconSize={d.iconSize}
          />
        ))}
      </div>
    );
  }

  let vendorGrid: ReactNode = null;
  if (vg) {
    const vendorIcons = POPULAR_VENDORS.map((v) => getVendorColorIcon(v))
      .filter((s): s is string => s !== null)
      .slice(0, vg.cols * vg.rows);
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
              ? vg
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
    staticMode: ctx.staticMode,
  });
}
