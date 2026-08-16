/** @jsxImportSource @kitajs/html */

import { pick } from "@/lib/utils/base";

import type { SatoriOptions } from "satori";
import { default as satori } from "satori";
import { fonts } from "../lib/cache";
import type { CipherTarget } from "../lib/types";
import { randInt } from "../lib/utils";
import { FONT_MONO } from "./typography";

const DIGITS = "0123456789";
const FRAME_COUNT = 8;
const FRAME_DURATION_MIN_MS = 100;
const FRAME_DURATION_MAX_MS = 140;
const STAGGER_MAX_MS = 80;

function scrambleValue(value: string): string {
  return value
    .split("")
    .map((ch) => {
      if (ch >= "0" && ch <= "9") {
        return pick(DIGITS);
      }
      return ch;
    })
    .join("");
}

function scrambleRightHalf(value: string): string {
  const digitPositions: number[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] >= "0" && value[i] <= "9") digitPositions.push(i);
  }
  const mid = Math.ceil(digitPositions.length / 2);
  const scrambleSet = new Set(digitPositions.slice(mid));

  return value
    .split("")
    .map((ch, i) => {
      if (scrambleSet.has(i)) {
        return pick(DIGITS);
      }
      return ch;
    })
    .join("");
}

async function renderTextPath(
  text: string,
  fontSize: number,
  opts: SatoriOptions,
): Promise<string> {
  const node = {
    type: "div",
    props: {
      style: { display: "flex" },
      children: {
        type: "span",
        props: {
          style: {
            fontFamily: FONT_MONO,
            fontSize,
            fontWeight: 700,
            color: "#fff",
          },
          children: text,
        },
      },
    },
  };
  const svg = await satori(node as never, opts);
  const match = svg.match(/<path[^>]+d="(M[^"]+)"/);
  return match ? match[1] : "";
}

function Frame(props: {
  d: string;
  color: string;
  dx: number;
  dy: number;
  beginS: string;
  durS: string;
  freeze?: boolean;
}) {
  return (
    <g transform={`translate(${props.dx},${props.dy})`} visibility="hidden">
      <path fill={props.color} d={props.d} />
      {props.freeze ? (
        <set
          attributeName="visibility"
          to="visible"
          begin={`${props.beginS}s`}
          fill="freeze"
        />
      ) : (
        <set
          attributeName="visibility"
          to="visible"
          begin={`${props.beginS}s`}
          dur={`${props.durS}s`}
        />
      )}
    </g>
  );
}

function LoopFrame(props: {
  d: string;
  color: string;
  dx: number;
  dy: number;
  values: string;
  cycleDurS: string;
  loopStartS: string;
}) {
  return (
    <g transform={`translate(${props.dx},${props.dy})`} visibility="hidden">
      <path fill={props.color} d={props.d} />
      <animate
        attributeName="visibility"
        values={props.values}
        calcMode="discrete"
        dur={`${props.cycleDurS}s`}
        begin={`${props.loopStartS}s`}
        repeatCount="indefinite"
      />
    </g>
  );
}

export type { CipherTarget } from "../lib/types";

export function pulseDot(
  cx: number,
  cy: number,
  r: number,
  fill: string,
  staticMode?: boolean,
): string {
  if (staticMode) return "";
  return (
    <circle cx={cx} cy={cy} r={r} fill={fill}>
      <animate
        attributeName="opacity"
        values="1;0.3;1"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>
  ) as string;
}

function stripCipherMarkers(svg: string, targets: CipherTarget[]): string {
  let result = svg;
  for (const target of targets) {
    result = result.replaceAll(
      `fill="${target.markerColor}"`,
      `fill="${target.color}"`,
    );
    // Satori draws text-decoration (the price strikethrough) as a stroked
    // <line>, which a fill-only pass left in the sentinel color.
    result = result.replaceAll(
      `stroke="${target.markerColor}"`,
      `stroke="${target.color}"`,
    );
  }
  return result;
}

// Marker + target are one fact: the sentinel fill in the JSX and the
// {value,fontSize,color} the scanner replaces it with must match exactly.
export function makeCipher() {
  const targets: CipherTarget[] = [];
  return {
    targets,
    mark(
      value: string,
      fontSize: number,
      color: string,
      loop?: boolean,
    ): string {
      const markerColor = cipherMarker(targets.length + 1);
      targets.push({ value, fontSize, color, markerColor, loop });
      return markerColor;
    },
  };
}

export function cipherMarker(index: number): string {
  return `#fe00${String(index).padStart(2, "0")}`;
}

export function replacePulseDotMarker(
  svg: string,
  markerColor: string,
  accentColor: string,
  staticMode?: boolean,
): string {
  const escaped = markerColor.replace("#", "\\#");
  const dotMarker =
    svg.match(
      new RegExp(`<(?:path|rect)[^>]*fill="${escaped}"[^>]*/?>`),
    )?.[0] ??
    svg.match(
      new RegExp(`<(?:path|rect)[^>]*>[^<]*fill="${escaped}"[^>]*/?>`),
    )?.[0];
  if (!dotMarker) return svg;

  const xM = dotMarker.match(/\bx="([\d.]+)"/);
  const yM = dotMarker.match(/\by="([\d.]+)"/);
  const wM = dotMarker.match(/\bwidth="([\d.]+)"/);
  const hM = dotMarker.match(/\bheight="([\d.]+)"/);
  if (!xM || !yM || !wM || !hM) return svg;

  const cx = parseFloat(xM[1]) + parseFloat(wM[1]) / 2;
  const cy = parseFloat(yM[1]) + parseFloat(hM[1]) / 2;
  const r = parseFloat(wM[1]) / 2;

  const circle = staticMode
    ? ((<circle cx={cx} cy={cy} r={r} fill={accentColor} />) as string)
    : ((
        <circle cx={cx} cy={cy} r={r} fill={accentColor}>
          <animate
            attributeName="opacity"
            values="1;0.3;1"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      ) as string);

  return svg.replace(dotMarker, circle);
}

export async function processCipherMarkers(
  svg: string,
  targets: CipherTarget[],
  staticMode?: boolean,
): Promise<string> {
  if (targets.length === 0) return svg;
  if (staticMode) return stripCipherMarkers(svg, targets);

  let result = svg;
  const injections: string[] = [];

  for (const target of targets) {
    // Satori draws text-decoration (the price strikethrough) as a stroked
    // <line> in the marker color; the glyph swap below never touches it.
    result = result.replaceAll(
      `stroke="${target.markerColor}"`,
      `stroke="${target.color}"`,
    );
    const markerRe = new RegExp(
      `<path[^>]*fill="${target.markerColor.replace("#", "\\#")}"[^>]*/?>`,
    );
    const markerMatch = result.match(markerRe);
    if (!markerMatch) continue;

    const dMatch = markerMatch[0].match(/\sd="M([\d.]+)\s+([\d.]+)/);
    if (!dMatch) continue;

    const pathX = parseFloat(dMatch[1]);
    const pathY = parseFloat(dMatch[2]);

    result = result.replace(markerMatch[0], "");

    const animation = await buildCipherAnimation(
      target.value,
      target.fontSize,
      target.color,
      pathX,
      pathY,
      target.loop ?? false,
    );
    if (animation) injections.push(animation);
  }

  if (injections.length > 0) {
    result = result.replace("</svg>", `${injections.join("")}</svg>`);
  }

  return result;
}

async function buildCipherAnimation(
  value: string,
  fontSize: number,
  color: string,
  x: number,
  y: number,
  loop: boolean,
): Promise<string> {
  const frameDur = randInt(FRAME_DURATION_MIN_MS, FRAME_DURATION_MAX_MS);
  const stagger = randInt(0, STAGGER_MAX_MS);

  const w = Math.ceil(fontSize * 0.65 * value.length) + 20;
  const h = Math.ceil(fontSize * 1.5);
  const opts: SatoriOptions = { width: w, height: h, fonts };

  const introJobs = [
    renderTextPath(value, fontSize, opts),
    ...Array.from({ length: FRAME_COUNT }, () =>
      renderTextPath(scrambleValue(value), fontSize, opts),
    ),
  ];
  const [realPathD, ...introDs] = await Promise.all(introJobs);

  if (!realPathD) return "";

  const originMatch = realPathD.match(/^M([\d.]+)\s+([\d.]+)/);
  if (!originMatch) return "";
  const originX = parseFloat(originMatch[1]);
  const originY = parseFloat(originMatch[2]);

  const dx = x - originX;
  const dy = y - originY;

  if (loop) {
    const loopDs = await Promise.all(
      Array.from({ length: FRAME_COUNT }, () =>
        renderTextPath(scrambleRightHalf(value), fontSize, opts),
      ),
    );
    return renderLoopingCipher(
      introDs,
      loopDs,
      color,
      dx,
      dy,
      frameDur,
      stagger,
    );
  }
  return renderSettleCipher(
    introDs,
    realPathD,
    color,
    dx,
    dy,
    frameDur,
    stagger,
  );
}

function renderSettleCipher(
  scrambleDs: string[],
  realPathD: string,
  color: string,
  dx: number,
  dy: number,
  frameDurMs: number,
  staggerMs: number,
): string {
  const durS = (frameDurMs / 1000).toFixed(3);

  const frames = scrambleDs
    .map((d, i) => {
      if (!d) return "";
      const beginS = ((staggerMs + i * frameDurMs) / 1000).toFixed(3);
      return (
        <Frame
          d={d}
          color={color}
          dx={dx}
          dy={dy}
          beginS={beginS}
          durS={durS}
        />
      );
    })
    .join("");

  const realBeginS = ((staggerMs + FRAME_COUNT * frameDurMs) / 1000).toFixed(3);
  const realFrame = (
    <Frame
      d={realPathD}
      color={color}
      dx={dx}
      dy={dy}
      beginS={realBeginS}
      durS=""
      freeze
    />
  );

  return frames + realFrame;
}

function renderLoopingCipher(
  introDs: string[],
  loopDs: string[],
  color: string,
  dx: number,
  dy: number,
  frameDurMs: number,
  staggerMs: number,
): string {
  const durS = (frameDurMs / 1000).toFixed(3);
  const validLoopFrames = loopDs.filter(Boolean);

  const introFrames = introDs
    .map((d, i) => {
      if (!d) return "";
      const beginS = ((staggerMs + i * frameDurMs) / 1000).toFixed(3);
      return (
        <Frame
          d={d}
          color={color}
          dx={dx}
          dy={dy}
          beginS={beginS}
          durS={durS}
        />
      );
    })
    .join("");

  let loopFrames = "";
  if (validLoopFrames.length > 0) {
    const loopStartMs = staggerMs + FRAME_COUNT * frameDurMs;
    const loopStartS = (loopStartMs / 1000).toFixed(3);
    const cycleDur = validLoopFrames.length * frameDurMs;
    const cycleDurS = (cycleDur / 1000).toFixed(3);

    loopFrames = validLoopFrames
      .map((d, i) => {
        const values = validLoopFrames
          .map((_, f) => (f === i ? "visible" : "hidden"))
          .join(";");
        return (
          <LoopFrame
            d={d}
            color={color}
            dx={dx}
            dy={dy}
            values={values}
            cycleDurS={cycleDurS}
            loopStartS={loopStartS}
          />
        );
      })
      .join("");
  }

  return introFrames + loopFrames;
}
