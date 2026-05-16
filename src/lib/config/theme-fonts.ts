import {
  Atkinson_Hyperlegible,
  Geist,
  Geist_Mono,
  IBM_Plex_Mono,
  Inter,
  JetBrains_Mono,
  Lexend,
  Manrope,
  Plus_Jakarta_Sans,
  Roboto_Mono,
  Source_Serif_4,
  Space_Grotesk,
} from "next/font/google";

/**
 * Curated font palette exposed in the theme picker. `next/font/google`
 * builds these at compile time so we can't add fonts at runtime; instead we
 * pre-import a sensible spread (~12 fonts incl. accessibility-friendly) and
 * the picker just toggles the active family by writing the CSS variable
 * reference into `userTheme.fonts.*`.
 *
 * Adding more fonts: import here and append to FONT_OPTIONS.
 */

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ibm-plex-mono",
});
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

export type FontKind = "sans" | "mono" | "display";

export type FontOption = {
  /** Stable id used in `userTheme.fonts.*` lookup. */
  id: string;
  /** Human label shown in the picker. */
  label: string;
  /** CSS variable that resolves to the font family at runtime. */
  cssVar: string;
  /** Which buckets this font is suitable for. */
  kinds: FontKind[];
  /** Whether to mark in the picker as accessibility-tuned. */
  accessibility?: boolean;
};

export const FONT_OPTIONS: FontOption[] = [
  // Sans / display
  {
    id: "inter",
    label: "Inter",
    cssVar: inter.variable,
    kinds: ["sans", "display"],
  },
  {
    id: "geist",
    label: "Geist",
    cssVar: geist.variable,
    kinds: ["sans", "display"],
  },
  {
    id: "manrope",
    label: "Manrope",
    cssVar: manrope.variable,
    kinds: ["sans", "display"],
  },
  {
    id: "plus-jakarta",
    label: "Plus Jakarta Sans",
    cssVar: plusJakarta.variable,
    kinds: ["sans", "display"],
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    cssVar: spaceGrotesk.variable,
    kinds: ["sans", "display"],
  },
  // Accessibility-tuned
  {
    id: "lexend",
    label: "Lexend (dyslexia-friendly)",
    cssVar: lexend.variable,
    kinds: ["sans"],
    accessibility: true,
  },
  {
    id: "atkinson",
    label: "Atkinson Hyperlegible (low-vision)",
    cssVar: atkinson.variable,
    kinds: ["sans"],
    accessibility: true,
  },
  // Serif
  {
    id: "source-serif",
    label: "Source Serif 4",
    cssVar: sourceSerif.variable,
    kinds: ["display"],
  },
  // Mono
  {
    id: "geist-mono",
    label: "Geist Mono",
    cssVar: geistMono.variable,
    kinds: ["mono"],
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    cssVar: jetbrainsMono.variable,
    kinds: ["mono"],
  },
  {
    id: "ibm-plex-mono",
    label: "IBM Plex Mono",
    cssVar: ibmPlexMono.variable,
    kinds: ["mono"],
  },
  {
    id: "roboto-mono",
    label: "Roboto Mono",
    cssVar: robotoMono.variable,
    kinds: ["mono"],
  },
];

/** Single space-joined string of every preloaded font CSS var, attached to
 *  `<body>` so all fonts are available for live preview without re-render. */
export const allFontVariablesClass = FONT_OPTIONS.map((f) => f.cssVar).join(
  " ",
);

/** Look up CSS family for a font id. Falls back to project default. */
export function fontStackFromId(
  id: string | undefined,
  kind: FontKind,
): string | undefined {
  if (!id) return undefined;
  const opt = FONT_OPTIONS.find((f) => f.id === id);
  if (!opt || !opt.kinds.includes(kind)) return undefined;
  // The cssVar is just `--font-foo`; we wrap in var() and add fallback stacks.
  const fallback =
    kind === "mono" ? "ui-monospace, monospace" : "ui-sans-serif, system-ui";
  return `var(${opt.cssVar}), ${fallback}`;
}
