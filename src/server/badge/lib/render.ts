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
