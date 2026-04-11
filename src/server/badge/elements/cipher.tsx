/** @jsxImportSource @kitajs/html */

import type { SatoriOptions } from "satori";
import { default as satori } from "satori";
import type { CipherTarget } from "../lib/types";
import { fonts } from "../lib/render";
import { FONT_MONO } from "./typography";

// ── Config ────────────────────────────────────────────────

const DIGITS = "0123456789";
const FRAME_COUNT = 8;
const FRAME_DURATION_MIN_MS = 100;
const FRAME_DURATION_MAX_MS = 140;
const STAGGER_MAX_MS = 80;

// ── Helpers ───────────────────────────────────────────────

/** Random int in [min, max] */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Only scramble digit characters; preserve letters, dots, commas, plus, etc. */
function scrambleValue(value: string): string {
  return value
    .split("")
    .map((ch) => {
      if (ch >= "0" && ch <= "9") {
        return DIGITS[Math.floor(Math.random() * DIGITS.length)];
      }
      return ch;
    })
    .join("");
}

/**
 * Scramble only the right half of digit positions.
 * Left-half digits keep their real values, right-half digits randomize.
 */
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
        return DIGITS[Math.floor(Math.random() * DIGITS.length)];
      }
      return ch;
    })
    .join("");
}

/** Render a single text string via Satori and return just the path `d` attribute */
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

// ── JSX Animation Components ─────────────────────────────
//
// Uses @kitajs/html JSX (renders to string, no React needed).
// Visibility + <set>/<animate calcMode="discrete"> for flash-free
// frame switching. See: https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_animation_with_SMIL

/** A frame visible for exactly one time slot via <set> */
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

/** A looping frame with calcMode="discrete" visibility cycling */
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

// ── Public API ────────────────────────────────────────────

export type { CipherTarget } from "../lib/types";

/**
 * When true, processCipherMarkers replaces marker fills instead of animating,
 * and pulseDot returns empty. Used for static PNG rendering.
 */
let staticMode = false;

export function setStaticMode(value: boolean) {
  staticMode = value;
}

export function isStaticMode(): boolean {
  return staticMode;
}

/** SMIL pulsing green circle (injected post-render). Returns empty in static mode. */
export function pulseDot(
  cx: number,
  cy: number,
  r: number,
  fill: string,
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

/**
 * Replace cipher marker fill colors with real text colors (for static PNG).
 * Keeps the original Satori-rendered text paths, just corrects their fill.
 */
export function stripCipherMarkers(
  svg: string,
  targets: CipherTarget[],
): string {
  let result = svg;
  for (const target of targets) {
    result = result.replaceAll(
      `fill="${target.markerColor}"`,
      `fill="${target.color}"`,
    );
  }
  return result;
}

/** Marker color for a given slot index (1-based) */
export function cipherMarker(index: number): string {
  return `#fe00${String(index).padStart(2, "0")}`;
}

/**
 * Find the pulseDotMarker rect/path in rendered SVG and replace it with
 * an animated (SVG) or static (PNG) accent-colored circle.
 */
export function replacePulseDotMarker(
  svg: string,
  markerColor: string,
  accentColor: string,
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

/**
 * Process a rendered SVG string: find paths with cipher marker fills,
 * replace them with animated scramble sequences.
 */
export async function processCipherMarkers(
  svg: string,
  targets: CipherTarget[],
): Promise<string> {
  if (targets.length === 0) return svg;
  if (staticMode) return stripCipherMarkers(svg, targets);

  let result = svg;
  const injections: string[] = [];

  for (const target of targets) {
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

// ── Animation renderers ──────────────────────────────────

/** Scramble plays once then settles on the real value permanently */
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

/**
 * Intro full-scramble frames flow directly into right-half-only loop frames.
 * Intro plays once sequentially, then loop repeats indefinitely.
 */
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

  // Intro frames
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

  // Loop frames
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
