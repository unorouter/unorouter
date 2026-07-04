/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import { env } from "@/lib/config/env";
import type { BadgeSize } from "@/lib/validation/badge";
import type { ReactNode } from "react";
import { Logo } from "../elements/primitives";
import { FONT_SANS } from "../elements/typography";
import { t } from "../lib/cache";
import { bgSvg, RAINBOW } from "../lib/glow";
import type { BadgeCtx, BadgeDimsBase } from "../lib/types";
import { renderBadgeTemplate, svgDataUri } from "../lib/utils";

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
    count: 8,
    showLabels: true,
    cell: 76,
    iconSize: 42,
    labelFont: 27,
    gap: 20,
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
    key: "BADGE.CHAT_LOCAL_FIRST",
    // shield-check
    icon: lucide(
      `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>`,
    ),
  },
  {
    key: "BADGE.CHAT_FREE_MODELS",
    // sparkles
    icon: lucide(
      `<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>`,
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
    key: "BADGE.CHAT_WEB_SEARCH",
    // globe
    icon: lucide(
      `<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>`,
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
  );

  let grid: ReactNode;
  if (d.showLabels) {
    const chipW = Math.floor((d.W - d.pad * 2 - d.gap) / 2);
    grid = (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          width: "100%",
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
            justifyContent: d.showLabels ? "flex-start" : "center",
            paddingTop: Math.round(d.pad * 0.5),
          }}
        >
          {grid}
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
