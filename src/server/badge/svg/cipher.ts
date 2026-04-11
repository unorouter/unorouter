import { default as satori } from "satori";
import type { SatoriOptions } from "satori";
import { badgeFonts } from "../satori";
import { FONT_MONO } from "./components";

// ── Config ────────────────────────────────────────────────

const DIGITS = "0123456789";
const FRAME_COUNT = 8;
const FRAME_DURATION_MS = 120;
const SETTLE_DURATION_MS = 200;

// ── Helpers ───────────────────────────────────────────────

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
 * E.g. "65,118" -> digit positions are [0,1,3,4,5], midpoint=2,
 * so positions 3,4,5 scramble: "65,802"
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

// ── Public API ────────────────────────────────────────────

export interface CipherTarget {
  /** The real display value, e.g. "3,094,930,527" */
  value: string;
  /** Font size used in the badge for this value */
  fontSize: number;
  /** Fill color for the text (theme-dependent) */
  color: string;
  /** Unique marker color assigned to this value in the Satori render */
  markerColor: string;
  /**
   * When true, after the initial cipher settles the right half of digits
   * keeps scrambling continuously (live counter look).
   */
  loop?: boolean;
}

/** Marker color for a given slot index (1-based) */
export function cipherMarker(index: number): string {
  return `#fe00${String(index).padStart(2, "0")}`;
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
  const w = Math.ceil(fontSize * 0.65 * value.length) + 20;
  const h = Math.ceil(fontSize * 1.5);
  const opts: SatoriOptions = { width: w, height: h, fonts: badgeFonts() };

  // Initial full-scramble frames (used for the intro cipher on all modes)
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
    // Render right-half-only scramble frames for the continuous loop
    const loopDs = await Promise.all(
      Array.from({ length: FRAME_COUNT }, () =>
        renderTextPath(scrambleRightHalf(value), fontSize, opts),
      ),
    );
    return buildLoopingCipher(introDs, loopDs, realPathD, color, dx, dy);
  }
  return buildSettleCipher(introDs, realPathD, color, dx, dy);
}

/** Scramble plays once then settles on the real value permanently */
function buildSettleCipher(
  scrambleDs: string[],
  realPathD: string,
  color: string,
  dx: number,
  dy: number,
): string {
  const parts: string[] = [];

  for (let i = 0; i < scrambleDs.length; i++) {
    if (!scrambleDs[i]) continue;
    const beginS = ((i * FRAME_DURATION_MS) / 1000).toFixed(3);
    const durS = (FRAME_DURATION_MS / 1000).toFixed(3);

    parts.push(
      `<g transform="translate(${dx},${dy})" opacity="0">` +
        `<path fill="${color}" d="${scrambleDs[i]}"/>` +
        `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.01;0.99;1" dur="${durS}s" begin="${beginS}s" fill="freeze"/>` +
        `</g>`,
    );
  }

  const realBeginS = ((FRAME_COUNT * FRAME_DURATION_MS) / 1000).toFixed(3);
  const settleDurS = (SETTLE_DURATION_MS / 1000).toFixed(3);

  parts.push(
    `<g transform="translate(${dx},${dy})" opacity="0">` +
      `<path fill="${color}" d="${realPathD}"/>` +
      `<animate attributeName="opacity" values="0;1" dur="${settleDurS}s" begin="${realBeginS}s" fill="freeze"/>` +
      `</g>`,
  );

  return parts.join("");
}

/**
 * Seamless cipher: intro full-scramble frames flow directly into
 * right-half-only loop frames with no gap or pause.
 *
 * Intro frames (all digits scrambled) play sequentially, then the loop
 * frames (only right-half digits scrambled) continue immediately and
 * repeat indefinitely via SMIL event chaining.
 */
function buildLoopingCipher(
  introDs: string[],
  loopDs: string[],
  _realPathD: string,
  color: string,
  dx: number,
  dy: number,
): string {
  const parts: string[] = [];
  const durS = (FRAME_DURATION_MS / 1000).toFixed(3);

  // ── Intro frames: play once sequentially ──
  for (let i = 0; i < introDs.length; i++) {
    if (!introDs[i]) continue;
    const beginS = ((i * FRAME_DURATION_MS) / 1000).toFixed(3);

    parts.push(
      `<g transform="translate(${dx},${dy})" opacity="0">` +
        `<path fill="${color}" d="${introDs[i]}"/>` +
        `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.01;0.99;1" dur="${durS}s" begin="${beginS}s" fill="freeze"/>` +
        `</g>`,
    );
  }

  // ── Loop frames: start immediately after intro, repeat forever ──
  const validLoopFrames = loopDs.filter(Boolean);
  if (validLoopFrames.length === 0) return parts.join("");

  // Loop starts right when the last intro frame ends
  const loopStartMs = FRAME_COUNT * FRAME_DURATION_MS;
  const uid = `cl${Math.abs(Math.round(dx * 100 + dy * 10))}`;
  const lastIdx = validLoopFrames.length - 1;

  for (let i = 0; i < validLoopFrames.length; i++) {
    const firstBeginMs = loopStartMs + i * FRAME_DURATION_MS;
    const firstBeginS = (firstBeginMs / 1000).toFixed(3);
    const offsetS = ((i * FRAME_DURATION_MS) / 1000).toFixed(3);
    // First play: absolute time. Repeats: relative to last frame ending.
    const beginAttr = `${firstBeginS}s;${uid}.end+${offsetS}s`;
    const idAttr = i === lastIdx ? ` id="${uid}"` : "";

    parts.push(
      `<g transform="translate(${dx},${dy})" opacity="0">` +
        `<path fill="${color}" d="${validLoopFrames[i]}"/>` +
        `<animate${idAttr} attributeName="opacity" values="0;1;1;0" keyTimes="0;0.01;0.99;1" dur="${durS}s" begin="${beginAttr}" fill="freeze"/>` +
        `</g>`,
    );
  }

  return parts.join("");
}
