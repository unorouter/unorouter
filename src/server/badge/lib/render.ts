import { readFileSync } from "fs";
import { join } from "path";
import type { ReactNode } from "react";
import satori, { type SatoriOptions } from "satori";

const fontsDir = join(process.cwd(), "src", "server", "badge", "fonts");

const fonts: SatoriOptions["fonts"] = [
  {
    name: "Space Grotesk",
    data: readFileSync(join(fontsDir, "space-grotesk-400.ttf")),
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "Space Grotesk",
    data: readFileSync(join(fontsDir, "space-grotesk-700.ttf")),
    weight: 700 as const,
    style: "normal" as const,
  },
  {
    name: "JetBrains Mono",
    data: readFileSync(join(fontsDir, "jetbrains-mono-700.ttf")),
    weight: 700 as const,
    style: "normal" as const,
  },
];

/** Fonts used for badge rendering (shared with cipher animation engine) */
export function badgeFonts(): SatoriOptions["fonts"] {
  return fonts;
}

/** Render a React JSX tree to SVG via Satori, then inject optional SMIL animations */
export async function renderBadge(
  node: ReactNode,
  width: number,
  height: number,
  smilInjections?: string,
): Promise<string> {
  let svg = await satori(node, { width, height, fonts });

  if (smilInjections) {
    svg = svg.replace("</svg>", `${smilInjections}</svg>`);
  }

  return svg;
}

// Lazy imports to avoid circular dependency (cipher → render → cipher)
let _replacePulseDotMarker: typeof import("./cipher").replacePulseDotMarker;
let _processCipherMarkers: typeof import("./cipher").processCipherMarkers;

async function loadCipher() {
  if (!_replacePulseDotMarker) {
    const mod = await import("./cipher");
    _replacePulseDotMarker = mod.replacePulseDotMarker;
    _processCipherMarkers = mod.processCipherMarkers;
  }
}

export interface RenderTemplateOpts {
  node: ReactNode;
  width: number;
  height: number;
  /** Inject raw SMIL before </svg> (e.g. pulseDot()) */
  smil?: string;
  /** Replace #fe0099 marker with animated pulse dot */
  pulseDot?: { markerColor: string; accentColor: string };
  /** Cipher animation targets */
  cipherTargets?: import("./cipher").CipherTarget[];
}

/**
 * Full badge render pipeline: Satori → pulse dot → cipher animations.
 * Templates call this instead of manually chaining renderBadge + replacePulseDotMarker + processCipherMarkers.
 */
export async function renderBadgeTemplate(
  opts: RenderTemplateOpts,
): Promise<string> {
  let svg = await renderBadge(opts.node, opts.width, opts.height, opts.smil);

  if (opts.pulseDot || (opts.cipherTargets && opts.cipherTargets.length > 0)) {
    await loadCipher();
  }

  if (opts.pulseDot) {
    svg = _replacePulseDotMarker(
      svg,
      opts.pulseDot.markerColor,
      opts.pulseDot.accentColor,
    );
  }

  if (opts.cipherTargets && opts.cipherTargets.length > 0) {
    svg = await _processCipherMarkers(svg, opts.cipherTargets);
  }

  return svg;
}
