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
  Amiri,
  Bad_Script,
  Bellota,
  Birthstone,
  Bonbon,
  Borel,
  Caveat,
  Comic_Relief,
  Coming_Soon,
  Cookie,
  Cormorant,
  Cormorant_Garamond,
  Cormorant_Infant,
  Cormorant_Upright,
  Crafty_Girls,
  Edu_NSW_ACT_Cursive,
  Edu_NSW_ACT_Foundation,
  Edu_SA_Beginner,
  Fleur_De_Leah,
  Forum,
  Gabriela,
  Handlee,
  Hubballi,
  Ibarra_Real_Nova,
  Kalam,
  Kurale,
  Libertinus_Serif,
  Mali,
  Metal,
  Pacifico,
  Patrick_Hand,
  Playwrite_DE_Grund,
  Playwrite_HU,
  Playwrite_US_Modern,
  Ruluko,
  Scheherazade_New,
  Simonetta,
  Sirivennela,
  Sofia,
  Suranna,
} from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "fallback",
  preload: false,
});
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "fallback",
  preload: false,
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "fallback",
  preload: false,
});
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "fallback",
  preload: false,
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "fallback",
  preload: false,
});
const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "fallback",
  preload: false,
});
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "fallback",
  preload: false,
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "fallback",
  preload: false,
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "fallback",
  preload: false,
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "fallback",
  preload: false,
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ibm-plex-mono",
  display: "fallback",
  preload: false,
});
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: "fallback",
  preload: false,
});

// adjustFontFallback is off on four families below because next derives the
// fallback's size-adjust from a precalculated metrics table that these are
// missing from, so the lookup throws and logs "Failed to find font override
// values" on every render. It already produced no override for them; the flag
// only stops the doomed lookup.
const sirivennela = Sirivennela({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sirivennela",
  display: "fallback",
  preload: false,
  adjustFontFallback: false,
});
const craftyGirls = Crafty_Girls({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-crafty-girls",
  display: "fallback",
  preload: false,
});
const borel = Borel({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-borel",
  display: "fallback",
  preload: false,
});
const mali = Mali({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mali",
  display: "fallback",
  preload: false,
});
const bonbon = Bonbon({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bonbon",
  display: "fallback",
  preload: false,
});
const birthstone = Birthstone({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-birthstone",
  display: "fallback",
  preload: false,
});
const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pacifico",
  display: "fallback",
  preload: false,
});
const kalam = Kalam({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-kalam",
  display: "fallback",
  preload: false,
});
const hubballi = Hubballi({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-hubballi",
  display: "fallback",
  preload: false,
});
const comingSoon = Coming_Soon({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-coming-soon",
  display: "fallback",
  preload: false,
});
const comicRelief = Comic_Relief({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-comic-relief",
  display: "fallback",
  preload: false,
  adjustFontFallback: false,
});
const badScript = Bad_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bad-script",
  display: "fallback",
  preload: false,
});
const bellota = Bellota({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bellota",
  display: "fallback",
  preload: false,
});
const sofia = Sofia({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sofia",
  display: "fallback",
  preload: false,
});
const fleurDeLeah = Fleur_De_Leah({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-fleur-de-leah",
  display: "fallback",
  preload: false,
});
const ruluko = Ruluko({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-ruluko",
  display: "fallback",
  preload: false,
});
const eduSaBeginner = Edu_SA_Beginner({
  subsets: ["latin"],
  variable: "--font-edu-sa-beginner",
  display: "fallback",
  preload: false,
});
const eduNswActCursive = Edu_NSW_ACT_Cursive({
  subsets: ["latin"],
  variable: "--font-edu-nsw-act-cursive",
  display: "fallback",
  preload: false,
  adjustFontFallback: false,
});
const eduNswActFoundation = Edu_NSW_ACT_Foundation({
  subsets: ["latin"],
  variable: "--font-edu-nsw-act-foundation",
  display: "fallback",
  preload: false,
});
const playwriteHu = Playwrite_HU({
  weight: "400",
  variable: "--font-playwrite-hu",
  display: "fallback",
});
const handlee = Handlee({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-handlee",
  display: "fallback",
  preload: false,
});
const patrickHand = Patrick_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-patrick-hand",
  display: "fallback",
  preload: false,
});
const cookie = Cookie({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-cookie",
  display: "fallback",
  preload: false,
});
const playwriteDeGrund = Playwrite_DE_Grund({
  weight: "400",
  variable: "--font-playwrite-de-grund",
  display: "fallback",
});
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "fallback",
  preload: false,
});
const playwriteUsModern = Playwrite_US_Modern({
  weight: "400",
  variable: "--font-playwrite-us-modern",
  display: "fallback",
});
const gabriela = Gabriela({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-gabriela",
  display: "fallback",
  preload: false,
});
const kurale = Kurale({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-kurale",
  display: "fallback",
  preload: false,
});
const ibarraRealNova = Ibarra_Real_Nova({
  subsets: ["latin"],
  variable: "--font-ibarra-real-nova",
  display: "fallback",
  preload: false,
});
const scheherazadeNew = Scheherazade_New({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-scheherazade-new",
  display: "fallback",
  preload: false,
});
const libertinusSerif = Libertinus_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-libertinus-serif",
  display: "fallback",
  preload: false,
  adjustFontFallback: false,
});
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant-garamond",
  display: "fallback",
  preload: false,
});
const cormorant = Cormorant({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "fallback",
  preload: false,
});
const amiri = Amiri({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-amiri",
  display: "fallback",
  preload: false,
});
const metal = Metal({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-metal",
  display: "fallback",
  preload: false,
});
const cormorantInfant = Cormorant_Infant({
  subsets: ["latin"],
  variable: "--font-cormorant-infant",
  display: "fallback",
  preload: false,
});
const cormorantUpright = Cormorant_Upright({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-cormorant-upright",
  display: "fallback",
  preload: false,
});
const forum = Forum({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-forum",
  display: "fallback",
  preload: false,
});
const suranna = Suranna({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-suranna",
  display: "fallback",
  preload: false,
});
const simonetta = Simonetta({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-simonetta",
  display: "fallback",
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
  {
    id: "sirivennela",
    label: "Sirivennela",
    cssVar: sirivennela.variable,
    varName: "--font-sirivennela",
    kinds: ["sans", "display"],
  },
  {
    id: "crafty-girls",
    label: "Crafty Girls",
    cssVar: craftyGirls.variable,
    varName: "--font-crafty-girls",
    kinds: ["display"],
  },
  {
    id: "borel",
    label: "Borel",
    cssVar: borel.variable,
    varName: "--font-borel",
    kinds: ["display"],
  },
  {
    id: "mali",
    label: "Mali",
    cssVar: mali.variable,
    varName: "--font-mali",
    kinds: ["display"],
  },
  {
    id: "bonbon",
    label: "Bonbon",
    cssVar: bonbon.variable,
    varName: "--font-bonbon",
    kinds: ["display"],
  },
  {
    id: "birthstone",
    label: "Birthstone",
    cssVar: birthstone.variable,
    varName: "--font-birthstone",
    kinds: ["display"],
  },
  {
    id: "pacifico",
    label: "Pacifico",
    cssVar: pacifico.variable,
    varName: "--font-pacifico",
    kinds: ["display"],
  },
  {
    id: "kalam",
    label: "Kalam",
    cssVar: kalam.variable,
    varName: "--font-kalam",
    kinds: ["display"],
  },
  {
    id: "hubballi",
    label: "Hubballi",
    cssVar: hubballi.variable,
    varName: "--font-hubballi",
    kinds: ["sans", "display"],
  },
  {
    id: "coming-soon",
    label: "Coming Soon",
    cssVar: comingSoon.variable,
    varName: "--font-coming-soon",
    kinds: ["display"],
  },
  {
    id: "comic-relief",
    label: "Comic Relief",
    cssVar: comicRelief.variable,
    varName: "--font-comic-relief",
    kinds: ["display"],
  },
  {
    id: "bad-script",
    label: "Bad Script",
    cssVar: badScript.variable,
    varName: "--font-bad-script",
    kinds: ["display"],
  },
  {
    id: "bellota",
    label: "Bellota",
    cssVar: bellota.variable,
    varName: "--font-bellota",
    kinds: ["display"],
  },
  {
    id: "sofia",
    label: "Sofia",
    cssVar: sofia.variable,
    varName: "--font-sofia",
    kinds: ["display"],
  },
  {
    id: "fleur-de-leah",
    label: "Fleur De Leah",
    cssVar: fleurDeLeah.variable,
    varName: "--font-fleur-de-leah",
    kinds: ["display"],
  },
  {
    id: "ruluko",
    label: "Ruluko",
    cssVar: ruluko.variable,
    varName: "--font-ruluko",
    kinds: ["sans", "display"],
  },
  {
    id: "edu-sa-beginner",
    label: "Edu SA Beginner",
    cssVar: eduSaBeginner.variable,
    varName: "--font-edu-sa-beginner",
    kinds: ["display"],
  },
  {
    id: "edu-nsw-act-cursive",
    label: "Edu NSW ACT Cursive",
    cssVar: eduNswActCursive.variable,
    varName: "--font-edu-nsw-act-cursive",
    kinds: ["display"],
  },
  {
    id: "edu-nsw-act-foundation",
    label: "Edu NSW ACT Foundation",
    cssVar: eduNswActFoundation.variable,
    varName: "--font-edu-nsw-act-foundation",
    kinds: ["display"],
  },
  {
    id: "playwrite-hu",
    label: "Playwrite HU",
    cssVar: playwriteHu.variable,
    varName: "--font-playwrite-hu",
    kinds: ["display"],
  },
  {
    id: "handlee",
    label: "Handlee",
    cssVar: handlee.variable,
    varName: "--font-handlee",
    kinds: ["display"],
  },
  {
    id: "patrick-hand",
    label: "Patrick Hand",
    cssVar: patrickHand.variable,
    varName: "--font-patrick-hand",
    kinds: ["display"],
  },
  {
    id: "cookie",
    label: "Cookie",
    cssVar: cookie.variable,
    varName: "--font-cookie",
    kinds: ["display"],
  },
  {
    id: "playwrite-de-grund",
    label: "Playwrite DE Grund",
    cssVar: playwriteDeGrund.variable,
    varName: "--font-playwrite-de-grund",
    kinds: ["display"],
  },
  {
    id: "caveat",
    label: "Caveat",
    cssVar: caveat.variable,
    varName: "--font-caveat",
    kinds: ["display"],
  },
  {
    id: "playwrite-us-modern",
    label: "Playwrite US Modern",
    cssVar: playwriteUsModern.variable,
    varName: "--font-playwrite-us-modern",
    kinds: ["display"],
  },
  {
    id: "gabriela",
    label: "Gabriela",
    cssVar: gabriela.variable,
    varName: "--font-gabriela",
    kinds: ["sans", "display"],
  },
  {
    id: "kurale",
    label: "Kurale",
    cssVar: kurale.variable,
    varName: "--font-kurale",
    kinds: ["sans", "display"],
  },
  {
    id: "ibarra-real-nova",
    label: "Ibarra Real Nova",
    cssVar: ibarraRealNova.variable,
    varName: "--font-ibarra-real-nova",
    kinds: ["sans", "display"],
  },
  {
    id: "scheherazade-new",
    label: "Scheherazade New",
    cssVar: scheherazadeNew.variable,
    varName: "--font-scheherazade-new",
    kinds: ["sans", "display"],
  },
  {
    id: "libertinus-serif",
    label: "Libertinus Serif",
    cssVar: libertinusSerif.variable,
    varName: "--font-libertinus-serif",
    kinds: ["sans", "display"],
  },
  {
    id: "cormorant-garamond",
    label: "Cormorant Garamond",
    cssVar: cormorantGaramond.variable,
    varName: "--font-cormorant-garamond",
    kinds: ["sans", "display"],
  },
  {
    id: "cormorant",
    label: "Cormorant",
    cssVar: cormorant.variable,
    varName: "--font-cormorant",
    kinds: ["sans", "display"],
  },
  {
    id: "amiri",
    label: "Amiri",
    cssVar: amiri.variable,
    varName: "--font-amiri",
    kinds: ["sans", "display"],
  },
  {
    id: "metal",
    label: "Metal",
    cssVar: metal.variable,
    varName: "--font-metal",
    kinds: ["display"],
  },
  {
    id: "cormorant-infant",
    label: "Cormorant Infant",
    cssVar: cormorantInfant.variable,
    varName: "--font-cormorant-infant",
    kinds: ["sans", "display"],
  },
  {
    id: "cormorant-upright",
    label: "Cormorant Upright",
    cssVar: cormorantUpright.variable,
    varName: "--font-cormorant-upright",
    kinds: ["sans", "display"],
  },
  {
    id: "forum",
    label: "Forum",
    cssVar: forum.variable,
    varName: "--font-forum",
    kinds: ["display"],
  },
  {
    id: "suranna",
    label: "Suranna",
    cssVar: suranna.variable,
    varName: "--font-suranna",
    kinds: ["sans", "display"],
  },
  {
    id: "simonetta",
    label: "Simonetta",
    cssVar: simonetta.variable,
    varName: "--font-simonetta",
    kinds: ["display"],
  },
];

export const allFontVariablesClass = FONT_OPTIONS.map((f) => f.cssVar).join(
  " ",
);
