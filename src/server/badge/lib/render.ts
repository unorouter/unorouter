import { readFileSync } from "fs";
import { join } from "path";
import satori, { type SatoriOptions } from "satori";
import {
  processCipherMarkers,
  replacePulseDotMarker,
} from "../elements/cipher";
import type { RenderTemplateOpts } from "./types";

const fontsDir = join(process.cwd(), "src", "server", "badge", "fonts");

export const fonts: SatoriOptions["fonts"] = [
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

export async function renderBadgeTemplate(
  opts: RenderTemplateOpts,
): Promise<string> {
  let svg = await satori(opts.node, {
    width: opts.width,
    height: opts.height,
    fonts,
  });

  if (opts.smil) {
    svg = svg.replace("</svg>", `${opts.smil}</svg>`);
  }

  if (opts.pulseDot) {
    svg = replacePulseDotMarker(
      svg,
      opts.pulseDot.markerColor,
      opts.pulseDot.accentColor,
    );
  }

  if (opts.cipherTargets && opts.cipherTargets.length > 0) {
    svg = await processCipherMarkers(svg, opts.cipherTargets);
  }

  return svg;
}
