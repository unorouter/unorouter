import type { SatoriOptions } from "satori";
import { default as satori } from "satori";
import { badgeFonts } from "../lib/render";
import { FONT_MONO } from "../lib/typography";

// ── Config ────────────────────────────────────────────────

const DIGITS = "0123456789";
const FRAME_COUNT = 8;
const FRAME_DURATION_MIN_MS = 100;
const FRAME_DURATION_MAX_MS = 140;
const STAGGER_MAX_MS = 80;

// ── SVG string builder (like snk's h() helper) ───────────

/** Build a self-closing SVG element string */
function el(tag: string, attrs: Record<string, string | number>): string {
  const a = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  return `<${tag} ${a}/>`;
}

/** Build an SVG element string with children */
function wrap(
  tag: string,
  attrs: Record<string, string | number>,
  children: string,
): string {
  const a = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  return `<${tag} ${a}>${children}</${tag}>`;
}

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
  // Each cipher target gets independent timing so they feel organic
  const frameDur = randInt(FRAME_DURATION_MIN_MS, FRAME_DURATION_MAX_MS);
  const stagger = randInt(0, STAGGER_MAX_MS);

  const w = Math.ceil(fontSize * 0.65 * value.length) + 20;
  const h = Math.ceil(fontSize * 1.5);
  const opts: SatoriOptions = { width: w, height: h, fonts: badgeFonts() };

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
    return renderLoopingCipher(introDs, loopDs, color, dx, dy, frameDur, stagger);
  }
  return renderSettleCipher(introDs, realPathD, color, dx, dy, frameDur, stagger);
}

// ── Animation renderers using visibility + <set> ─────────
//
// Uses <set attributeName="visibility"> for discrete frame switching.
// Unlike opacity animation, visibility is inherently discrete (no
// interpolation), eliminating flash/gap artifacts between frames.
// See: https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_animation_with_SMIL

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
  const parts: string[] = [];

  // Scramble frames: each visible for exactly one slot via <set>
  for (let i = 0; i < scrambleDs.length; i++) {
    if (!scrambleDs[i]) continue;
    const beginS = ((staggerMs + i * frameDurMs) / 1000).toFixed(3);
    const path = el("path", { fill: color, d: scrambleDs[i] });
    const show = el("set", {
      attributeName: "visibility",
      to: "visible",
      begin: `${beginS}s`,
      dur: `${durS}s`,
    });
    parts.push(
      wrap("g", { transform: `translate(${dx},${dy})`, visibility: "hidden" }, path + show),
    );
  }

  // Real value: becomes visible after all scramble frames and stays
  const realBeginS = ((staggerMs + FRAME_COUNT * frameDurMs) / 1000).toFixed(3);
  const realPath = el("path", { fill: color, d: realPathD });
  const realShow = el("set", {
    attributeName: "visibility",
    to: "visible",
    begin: `${realBeginS}s`,
    fill: "freeze",
  });
  parts.push(
    wrap("g", { transform: `translate(${dx},${dy})`, visibility: "hidden" }, realPath + realShow),
  );

  return parts.join("");
}

/**
 * Intro full-scramble frames flow directly into right-half-only loop frames.
 * Intro plays once sequentially, then loop repeats indefinitely.
 *
 * Uses <animate calcMode="discrete"> on visibility for the loop phase,
 * giving frame-perfect switching with zero flash.
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
  const parts: string[] = [];

  // Intro frames: each visible for exactly one slot via <set>
  for (let i = 0; i < introDs.length; i++) {
    if (!introDs[i]) continue;
    const beginS = ((staggerMs + i * frameDurMs) / 1000).toFixed(3);
    const path = el("path", { fill: color, d: introDs[i] });
    const show = el("set", {
      attributeName: "visibility",
      to: "visible",
      begin: `${beginS}s`,
      dur: `${durS}s`,
    });
    parts.push(
      wrap("g", { transform: `translate(${dx},${dy})`, visibility: "hidden" }, path + show),
    );
  }

  // Loop frames: use calcMode="discrete" with visibility values
  // Each frame gets its own <animate> that cycles between visible/hidden
  // timed so exactly one frame is visible at any point in the cycle
  if (validLoopFrames.length > 0) {
    const loopStartMs = staggerMs + FRAME_COUNT * frameDurMs;
    const loopStartS = (loopStartMs / 1000).toFixed(3);
    const cycleDur = validLoopFrames.length * frameDurMs;
    const cycleDurS = (cycleDur / 1000).toFixed(3);

    for (let i = 0; i < validLoopFrames.length; i++) {
      // Build values: "hidden" for all slots except this one which is "visible"
      const values = validLoopFrames
        .map((_, f) => (f === i ? "visible" : "hidden"))
        .join(";");

      const path = el("path", { fill: color, d: validLoopFrames[i] });
      const anim = el("animate", {
        attributeName: "visibility",
        values,
        calcMode: "discrete",
        dur: `${cycleDurS}s`,
        begin: `${loopStartS}s`,
        repeatCount: "indefinite",
      });
      parts.push(
        wrap("g", { transform: `translate(${dx},${dy})`, visibility: "hidden" }, path + anim),
      );
    }
  }

  return parts.join("");
}
