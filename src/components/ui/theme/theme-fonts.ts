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

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "optional",
  preload: false,
});
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "optional",
  preload: false,
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "optional",
  preload: false,
});
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "optional",
  preload: false,
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "optional",
  preload: false,
});
const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "optional",
  preload: false,
});
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "optional",
  preload: false,
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "optional",
  preload: false,
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "optional",
  preload: false,
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "optional",
  preload: false,
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ibm-plex-mono",
  display: "optional",
  preload: false,
});
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: "optional",
  preload: false,
});

type FontKind = "sans" | "mono" | "display";

export type FontOption = {
  id: string;
  label: string;
  cssVar: string;
  varName: string;
  kinds: FontKind[];
  accessibility?: boolean;
};

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "inter",
    label: "Inter",
    cssVar: inter.variable,
    varName: "--font-inter",
    kinds: ["sans", "display"],
  },
  {
    id: "geist",
    label: "Geist",
    cssVar: geist.variable,
    varName: "--font-geist",
    kinds: ["sans", "display"],
  },
  {
    id: "manrope",
    label: "Manrope",
    cssVar: manrope.variable,
    varName: "--font-manrope",
    kinds: ["sans", "display"],
  },
  {
    id: "plus-jakarta",
    label: "Plus Jakarta Sans",
    cssVar: plusJakarta.variable,
    varName: "--font-plus-jakarta",
    kinds: ["sans", "display"],
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    cssVar: spaceGrotesk.variable,
    varName: "--font-space-grotesk",
    kinds: ["sans", "display"],
  },
  {
    id: "lexend",
    label: "Lexend (dyslexia-friendly)",
    cssVar: lexend.variable,
    varName: "--font-lexend",
    kinds: ["sans"],
    accessibility: true,
  },
  {
    id: "atkinson",
    label: "Atkinson Hyperlegible (low-vision)",
    cssVar: atkinson.variable,
    varName: "--font-atkinson",
    kinds: ["sans"],
    accessibility: true,
  },
  {
    id: "source-serif",
    label: "Source Serif 4",
    cssVar: sourceSerif.variable,
    varName: "--font-source-serif",
    kinds: ["display"],
  },
  {
    id: "geist-mono",
    label: "Geist Mono",
    cssVar: geistMono.variable,
    varName: "--font-geist-mono",
    kinds: ["mono"],
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    cssVar: jetbrainsMono.variable,
    varName: "--font-jetbrains-mono",
    kinds: ["mono"],
  },
  {
    id: "ibm-plex-mono",
    label: "IBM Plex Mono",
    cssVar: ibmPlexMono.variable,
    varName: "--font-ibm-plex-mono",
    kinds: ["mono"],
  },
  {
    id: "roboto-mono",
    label: "Roboto Mono",
    cssVar: robotoMono.variable,
    varName: "--font-roboto-mono",
    kinds: ["mono"],
  },
];

export const allFontVariablesClass = FONT_OPTIONS.map((f) => f.cssVar).join(
  " ",
);
