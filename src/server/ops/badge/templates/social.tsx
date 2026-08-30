/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ReactNode } from "react";
import type { SocialSize, Theme } from "@/lib/validation/badge";
import { FONT_SANS } from "../elements/typography";
import { brandTld, Logo } from "../elements/primitives";
import { bgSvg, RAINBOW } from "../lib/glow";
import {
  getVendorColorIcon,
  POPULAR_VENDORS,
  prepIconSvg,
  renderBadgeTemplate,
  svgDataUri,
} from "../lib/utils";

interface SocialCtx {
  theme: Theme;
  size: SocialSize;
  staticMode?: boolean;
  modelCount: number;
}

interface SocialDims {
  W: number;
  H: number;
  pad: number;
  logoSize: number;
  titleFont: number;
  taglineFont: number;
  cell: number;
  iconSize: number;
  gridGap: number;
  layout: "strip" | "grid";
  wordmarkWidth?: number;
  cols?: number;
  gridWidth?: number;
  showTagline: boolean;
}

const DIMS: Record<SocialSize, SocialDims> = {
  reddit: {
    W: 2144,
    H: 256,
    pad: 72,
    logoSize: 120,
    titleFont: 76,
    taglineFont: 28,
    cell: 116,
    iconSize: 60,
    gridGap: 16,
    layout: "strip",
    wordmarkWidth: 1020,
    showTagline: true,
  },
  "reddit-mobile": {
    W: 2160,
    H: 256,
    pad: 72,
    logoSize: 120,
    titleFont: 76,
    taglineFont: 28,
    cell: 116,
    iconSize: 60,
    gridGap: 16,
    layout: "strip",
    wordmarkWidth: 880,
    showTagline: false,
  },
  discord: {
    W: 960,
    H: 540,
    pad: 48,
    logoSize: 88,
    titleFont: 48,
    taglineFont: 20,
    cell: 84,
    iconSize: 46,
    gridGap: 12,
    layout: "grid",
    cols: 4,
    gridWidth: 372,
    showTagline: true,
  },
  "discord-invite": {
    W: 1920,
    H: 1080,
    pad: 96,
    logoSize: 176,
    titleFont: 96,
    taglineFont: 40,
    cell: 168,
    iconSize: 92,
    gridGap: 24,
    layout: "grid",
    cols: 4,
    gridWidth: 744,
    showTagline: true,
  },
};

function IconCell(props: { svg: string; cell: number; iconSize: number }) {
  return (
    <div
      style={{
        display: "flex",
        width: props.cell,
        height: props.cell,
        borderRadius: 18,
        backgroundColor: "rgba(10,8,16,0.72)",
        border: "1px solid rgba(255,255,255,0.06)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={svgDataUri(prepIconSvg(props.svg))}
        width={props.iconSize}
        height={props.iconSize}
      />
    </div>
  );
}

function Wordmark(props: {
  logoSize: number;
  titleFont: number;
  taglineFont: number;
  muted: string;
  showTagline: boolean;
  maxTaglineWidth: number;
  modelCount: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <Logo size={props.logoSize} />
        <div
          style={{
            display: "flex",
            fontFamily: FONT_SANS,
            fontSize: props.titleFont,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          <span style={{ color: "#ffffff" }}>UNO</span>
          <span style={{ color: props.muted }}>ROUTER</span>
          <span style={{ color: props.muted }}>{brandTld.toUpperCase()}</span>
        </div>
      </div>
      {props.showTagline && (
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: props.taglineFont,
            color: "#9aa0a6",
            maxWidth: props.maxTaglineWidth,
          }}
        >
          One API for {props.modelCount}+ AI models. OpenAI, Anthropic, Google,
          and more.
        </span>
      )}
    </div>
  );
}

export async function generateSocial(ctx: SocialCtx): Promise<string> {
  const d = DIMS[ctx.size] ?? DIMS.reddit;

  const icons = POPULAR_VENDORS.map((v) => getVendorColorIcon(v)).filter(
    (s): s is string => s !== null,
  );

  let content: ReactNode;

  if (d.layout === "strip") {
    const wmWidth = d.wordmarkWidth ?? Math.round(d.W * 0.46);
    const iconArea = d.W - wmWidth - d.pad * 2;
    const fit = Math.max(0, Math.floor(iconArea / (d.cell + d.gridGap)));
    const row = icons.slice(0, fit);
    content = (
      <div
        style={{
          display: "flex",
          width: d.W,
          height: "100%",
          alignItems: "center",
          padding: `0 ${d.pad}px`,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", width: wmWidth, flexShrink: 0 }}>
          <Wordmark
            logoSize={d.logoSize}
            titleFont={d.titleFont}
            taglineFont={d.taglineFont}
            muted="#a7adb8"
            showTagline={d.showTagline}
            maxTaglineWidth={wmWidth - d.logoSize - 30}
            modelCount={ctx.modelCount}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: d.gridGap,
            alignItems: "center",
            justifyContent: "flex-end",
            flex: 1,
          }}
        >
          {row.map((svg, i) => (
            <IconCell key={i} svg={svg} cell={d.cell} iconSize={d.iconSize} />
          ))}
        </div>
      </div>
    );
  } else {
    const capacity = d.cols! * Math.ceil(d.H / (d.cell + d.gridGap));
    const cells = icons.slice(0, Math.min(icons.length, capacity));
    const grid = (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          width: d.gridWidth,
          gap: d.gridGap,
          transform: "rotate(-9deg)",
          alignContent: "center",
          justifyContent: "center",
        }}
      >
        {cells.map((svg, i) => (
          <IconCell key={i} svg={svg} cell={d.cell} iconSize={d.iconSize} />
        ))}
      </div>
    );
    content = (
      <div
        style={{
          display: "flex",
          width: d.W,
          height: "100%",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            paddingLeft: d.pad,
            flex: 1,
          }}
        >
          <Wordmark
            logoSize={d.logoSize}
            titleFont={d.titleFont}
            taglineFont={d.taglineFont}
            muted="#a7adb8"
            showTagline={d.showTagline}
            maxTaglineWidth={d.W - d.gridWidth! - d.pad * 2 - 40}
            modelCount={ctx.modelCount}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: d.gridWidth! + d.pad,
            height: "100%",
          }}
        >
          {grid}
        </div>
      </div>
    );
  }

  const rainbowH = 1;
  const focusX = d.layout === "strip" ? 84 : 78;
  const glowIntensity = d.layout === "strip" ? 0.5 : 0.85;
  const node = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: d.W,
        height: d.H,
      }}
    >
      <div style={{ display: "flex", width: d.W, height: d.H - rainbowH }}>
        {content}
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
    svgBackground: bgSvg(d.W, d.H, focusX, glowIntensity, d.layout),
    staticMode: ctx.staticMode,
  });
}
