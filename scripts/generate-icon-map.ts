#!/usr/bin/env bun
// Regenerates src/lib/config/icon-map.ts with per-icon lazy loaders for all
// six libraries. Source of truth = BASE below (kebab key -> lucide PascalCase
// base + curated tabler name) plus per-lib OVERRIDES for naming divergences.
// Candidates are validated against the installed packages; a lib with no match
// is omitted from the entry and falls back to lucide at runtime (icon.tsx).

import { readdir, readFile, writeFile } from "node:fs/promises";

const kebab = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Za-z])([0-9])/g, "$1-$2")
    .toLowerCase();

// Current map is the input: key + Lu/Tb names + verbatim local-icons loaders.
const src = await readFile("src/lib/config/icon-map.ts", "utf8");
type Entry = {
  key: string;
  lu: string | null;
  tb: string | null;
  localLucide: string | null;
  localTabler: string | null;
};
const entries: Entry[] = [];
for (const m of src.matchAll(/"?([a-z0-9-]+)"?: \{\n([\s\S]*?)\n  \},/g)) {
  const body = m[2];
  const lucidePart = body.split("tabler:")[0];
  const tablerPart = body.slice(lucidePart.length);
  entries.push({
    key: m[1],
    lu: body.match(/m\.Lu(\w+)/)?.[1] ?? null,
    tb: body.match(/m\.Tb(\w+)/)?.[1] ?? null,
    localLucide: lucidePart.match(/local-icons[\s\S]*?m\.(\w+)/)?.[1] ?? null,
    localTabler: tablerPart.match(/local-icons[\s\S]*?m\.(\w+)/)?.[1] ?? null,
  });
}

// Installed-package export inventories.
const lucideSet = new Set(
  (await readdir("node_modules/lucide-react/dist/esm/icons"))
    .filter((f) => f.endsWith(".mjs"))
    .map((f) => f.replace(".mjs", "")),
);
const tablerSet = new Set(
  (await readdir("node_modules/@tabler/icons-react/dist/esm/icons"))
    .filter((f) => f.endsWith(".mjs"))
    .map((f) => f.replace(".mjs", "")),
);
const phosphorSet = new Set(
  (await readdir("node_modules/@phosphor-icons/react/dist/ssr"))
    .filter((f) => f.endsWith(".d.ts"))
    .map((f) => f.replace(".d.ts", "")),
);
const heroSet = new Set(
  (await readdir("node_modules/@heroicons/react/24/outline"))
    .filter((f) => f.endsWith(".js"))
    .map((f) => f.replace(".js", "")),
);
const remixSet = new Set(
  [
    ...(
      await readFile("node_modules/@remixicon/react/index.d.ts", "utf8")
    ).matchAll(/declare const (Ri\w+)/g),
  ].map((m) => m[1]),
);
const iconoirSet = new Set(
  (await readdir("node_modules/iconoir-react/dist/esm/regular"))
    .filter((f) => f.endsWith(".mjs"))
    .map((f) => f.replace(".mjs", "")),
);

// Lucide renamed/dropped icons relative to the react-icons lu snapshot.
const LUCIDE_FILE_OVERRIDES: Record<string, string> = {
  Fingerprint: "fingerprint-pattern",
};
// Dropped from lucide entirely (brand purge); served from local-icons instead.
const LUCIDE_LOCAL_FALLBACK: Record<string, string> = {
  Github: "GithubIcon",
};
// Tabler casing drift.
const TABLER_FILE_OVERRIDES: Record<string, string> = {
  Grid3X3: "IconGrid3x3",
};

// Curated per-lib names where conventions diverge. Validated below; bad
// guesses simply stay misses.
const OVERRIDES: Record<string, Partial<Record<string, string[]>>> = {
  "arrow-left-right": {
    phosphor: ["ArrowsLeftRight"],
    heroicons: ["ArrowsRightLeftIcon"],
    remix: ["RiArrowLeftRightLine"],
    iconoir: ["DataTransferHorizontal", "ArrowsLeftRight"],
  },
  "arrow-right-left": {
    phosphor: ["ArrowsLeftRight"],
    heroicons: ["ArrowsRightLeftIcon"],
    remix: ["RiArrowLeftRightLine"],
    iconoir: ["DataTransferHorizontal", "ArrowsLeftRight"],
  },
  "arrow-up-down": {
    phosphor: ["ArrowsDownUp"],
    heroicons: ["ArrowsUpDownIcon"],
    iconoir: ["DataTransferVertical", "ArrowsUpDown"],
  },
  "arrow-down-right": { remix: ["RiArrowRightDownLine"] },
  "arrow-up-right": { remix: ["RiArrowRightUpLine"] },
  "chevron-down": {
    phosphor: ["CaretDown"],
    remix: ["RiArrowDownSLine"],
    iconoir: ["NavArrowDown"],
  },
  "chevron-left": {
    phosphor: ["CaretLeft"],
    remix: ["RiArrowLeftSLine"],
    iconoir: ["NavArrowLeft"],
  },
  "chevron-right": {
    phosphor: ["CaretRight"],
    remix: ["RiArrowRightSLine"],
    iconoir: ["NavArrowRight"],
  },
  "chevrons-down-up": {
    phosphor: ["ArrowsInLineVertical"],
    heroicons: ["ChevronUpDownIcon"],
    remix: ["RiContractUpDownLine"],
  },
  "chevrons-left": {
    phosphor: ["CaretDoubleLeft"],
    heroicons: ["ChevronDoubleLeftIcon"],
    remix: ["RiArrowLeftDoubleLine"],
    iconoir: ["FastArrowLeft"],
  },
  "chevrons-right": {
    phosphor: ["CaretDoubleRight"],
    heroicons: ["ChevronDoubleRightIcon"],
    remix: ["RiArrowRightDoubleLine"],
    iconoir: ["FastArrowRight"],
  },
  "chevrons-up-down": {
    phosphor: ["CaretUpDown"],
    heroicons: ["ChevronUpDownIcon"],
    remix: ["RiExpandUpDownLine"],
  },
  activity: {
    phosphor: ["Pulse"],
    heroicons: ["SignalIcon"],
    remix: ["RiPulseLine"],
  },
  "circle-alert": {
    phosphor: ["WarningCircle"],
    heroicons: ["ExclamationCircleIcon"],
    remix: ["RiErrorWarningLine"],
    iconoir: ["WarningCircle"],
  },
  "alert-circle": {
    phosphor: ["WarningCircle"],
    heroicons: ["ExclamationCircleIcon"],
    remix: ["RiErrorWarningLine"],
    iconoir: ["WarningCircle"],
  },
  "circle-check": {
    phosphor: ["CheckCircle"],
    heroicons: ["CheckCircleIcon"],
    remix: ["RiCheckboxCircleLine"],
    iconoir: ["CheckCircle"],
  },
  "circle-help": {
    phosphor: ["Question"],
    heroicons: ["QuestionMarkCircleIcon"],
    remix: ["RiQuestionLine"],
    iconoir: ["HelpCircle"],
  },
  "circle-x": {
    phosphor: ["XCircle"],
    heroicons: ["XCircleIcon"],
    remix: ["RiCloseCircleLine"],
    iconoir: ["XmarkCircle"],
  },
  "x-circle": {
    phosphor: ["XCircle"],
    heroicons: ["XCircleIcon"],
    remix: ["RiCloseCircleLine"],
    iconoir: ["XmarkCircle"],
  },
  "triangle-alert": {
    phosphor: ["Warning"],
    heroicons: ["ExclamationTriangleIcon"],
    remix: ["RiAlertLine"],
    iconoir: ["WarningTriangle"],
  },
  "octagon-x": {
    phosphor: ["Prohibit"],
    heroicons: ["NoSymbolIcon"],
    remix: ["RiForbidLine"],
    iconoir: ["Prohibition"],
  },
  info: {
    heroicons: ["InformationCircleIcon"],
    remix: ["RiInformationLine"],
    iconoir: ["InfoCircle"],
  },
  loader: { heroicons: ["ArrowPathIcon"] },
  "chart-bar": {
    remix: ["RiBarChartHorizontalLine"],
    iconoir: ["StatsReport"],
  },
  "chart-column": {
    phosphor: ["ChartBar"],
    heroicons: ["ChartBarIcon"],
    remix: ["RiBarChartLine"],
    iconoir: ["StatsUpSquare"],
  },
  "chart-column-big": {
    phosphor: ["ChartBar"],
    heroicons: ["ChartBarIcon"],
    remix: ["RiBarChart2Line"],
    iconoir: ["StatsUpSquare"],
  },
  "chart-pie": { remix: ["RiPieChartLine"], iconoir: ["PieChart"] },
  "trending-down": {
    phosphor: ["TrendDown"],
    heroicons: ["ArrowTrendingDownIcon"],
    remix: ["RiStockLine"],
    iconoir: ["GraphDown", "StatDown"],
  },
  "trending-up": {
    phosphor: ["TrendUp"],
    heroicons: ["ArrowTrendingUpIcon"],
    remix: ["RiLineChartLine"],
    iconoir: ["GraphUp", "StatUp"],
  },
  gauge: {
    remix: ["RiDashboard3Line", "RiSpeedLine"],
    iconoir: ["DashboardSpeed"],
  },
  "book-open": { iconoir: ["OpenBook"] },
  "book-text": {
    phosphor: ["BookOpenText"],
    heroicons: ["BookOpenIcon"],
    remix: ["RiBookOpenLine"],
    iconoir: ["OpenBook"],
  },
  "clipboard-copy": {
    phosphor: ["ClipboardText"],
    heroicons: ["ClipboardDocumentIcon"],
    remix: ["RiClipboardLine"],
    iconoir: ["PasteClipboard"],
  },
  clock: { remix: ["RiTimeLine"] },
  "cloud-off": { phosphor: ["CloudSlash"], iconoir: ["CloudXmark"] },
  "cloud-upload": {
    phosphor: ["CloudArrowUp"],
    heroicons: ["CloudArrowUpIcon"],
    remix: ["RiUploadCloud2Line"],
  },
  code: { heroicons: ["CodeBracketIcon"] },
  copy: { heroicons: ["DocumentDuplicateIcon"], remix: ["RiFileCopyLine"] },
  cpu: { heroicons: ["CpuChipIcon"] },
  database: { heroicons: ["CircleStackIcon"] },
  dices: {
    phosphor: ["DiceFive"],
    remix: ["RiDiceLine"],
    iconoir: ["DiceFive", "Dice5"],
  },
  "dollar-sign": {
    phosphor: ["CurrencyDollar"],
    heroicons: ["CurrencyDollarIcon"],
    remix: ["RiMoneyDollarCircleLine"],
    iconoir: ["Dollar"],
  },
  download: { heroicons: ["ArrowDownTrayIcon"] },
  drama: { phosphor: ["MaskHappy"] },
  ellipsis: {
    phosphor: ["DotsThree"],
    heroicons: ["EllipsisHorizontalIcon"],
    remix: ["RiMoreLine"],
    iconoir: ["MoreHoriz"],
  },
  "ellipsis-vertical": {
    phosphor: ["DotsThreeVertical"],
    remix: ["RiMore2Line"],
    iconoir: ["MoreVert"],
  },
  eraser: { iconoir: ["Erase"] },
  "external-link": {
    phosphor: ["ArrowSquareOut"],
    heroicons: ["ArrowTopRightOnSquareIcon"],
    iconoir: ["OpenNewWindow"],
  },
  "eye-off": {
    phosphor: ["EyeSlash"],
    heroicons: ["EyeSlashIcon"],
    iconoir: ["EyeClosed"],
  },
  file: { heroicons: ["DocumentIcon"], iconoir: ["Page", "EmptyPage"] },
  "file-text": { heroicons: ["DocumentTextIcon"], iconoir: ["Page"] },
  "file-question": { remix: ["RiFileUnknowLine"] },
  filter: { phosphor: ["FunnelSimple"], heroicons: ["FunnelIcon"] },
  fingerprint: { heroicons: ["FingerPrintIcon"] },
  github: { phosphor: ["GithubLogo"] },
  globe: { heroicons: ["GlobeAltIcon"] },
  grid: {
    phosphor: ["GridFour"],
    heroicons: ["Squares2X2Icon"],
    iconoir: ["ViewGrid"],
  },
  "grid-3x3": {
    phosphor: ["GridNine"],
    heroicons: ["TableCellsIcon"],
    remix: ["RiGridLine"],
    iconoir: ["ViewGrid"],
  },
  "grip-vertical": { phosphor: ["DotsSixVertical"], remix: ["RiDraggable"] },
  hash: {
    heroicons: ["HashtagIcon"],
    remix: ["RiHashtag"],
    iconoir: ["Hashtag"],
  },
  "heart-pulse": { phosphor: ["Heartbeat"], heroicons: ["HeartIcon"] },
  house: {
    heroicons: ["HomeIcon"],
    remix: ["RiHome4Line"],
    iconoir: ["Home"],
  },
  image: { heroicons: ["PhotoIcon"], iconoir: ["MediaImage"] },
  "image-down": { iconoir: ["MediaImage"] },
  "key-round": {
    phosphor: ["Key"],
    heroicons: ["KeyIcon"],
    remix: ["RiKey2Line"],
    iconoir: ["Key"],
  },
  layers: {
    phosphor: ["Stack"],
    heroicons: ["Square3Stack3DIcon"],
    remix: ["RiStackLine"],
  },
  "layout-dashboard": {
    phosphor: ["SquaresFour"],
    heroicons: ["Squares2X2Icon"],
    remix: ["RiDashboardLine"],
    iconoir: ["Dashboard", "ViewGrid"],
  },
  "layout-grid": {
    phosphor: ["SquaresFour"],
    heroicons: ["Squares2X2Icon"],
    iconoir: ["ViewGrid"],
  },
  link: { remix: ["RiLink", "RiLinkM"] },
  list: { heroicons: ["ListBulletIcon"], remix: ["RiListUnordered"] },
  lock: { heroicons: ["LockClosedIcon"] },
  "log-in": {
    phosphor: ["SignIn"],
    heroicons: ["ArrowRightEndOnRectangleIcon"],
    remix: ["RiLoginBoxLine"],
    iconoir: ["LogIn"],
  },
  "log-out": {
    phosphor: ["SignOut"],
    heroicons: ["ArrowRightStartOnRectangleIcon"],
    remix: ["RiLogoutBoxLine"],
    iconoir: ["LogOut"],
  },
  mail: { phosphor: ["EnvelopeSimple"], heroicons: ["EnvelopeIcon"] },
  menu: { phosphor: ["List"], heroicons: ["Bars3Icon"] },
  "message-circle": {
    phosphor: ["ChatCircle"],
    heroicons: ["ChatBubbleOvalLeftIcon"],
    remix: ["RiChat1Line", "RiChat3Line"],
    iconoir: ["ChatBubbleEmpty", "ChatBubble"],
  },
  "message-square": {
    phosphor: ["ChatSquare", "Chat"],
    heroicons: ["ChatBubbleLeftIcon"],
    remix: ["RiChat4Line", "RiQuestionAnswerLine"],
    iconoir: ["ChatLines", "ChatBubbleEmpty"],
  },
  mic: {
    phosphor: ["Microphone"],
    heroicons: ["MicrophoneIcon"],
    iconoir: ["Microphone"],
  },
  monitor: {
    heroicons: ["ComputerDesktopIcon"],
    remix: ["RiComputerLine"],
    iconoir: ["Computer"],
  },
  moon: { iconoir: ["HalfMoon"] },
  music: {
    phosphor: ["MusicNotes"],
    heroicons: ["MusicalNoteIcon"],
    iconoir: ["MusicDoubleNote", "MusicNote"],
  },
  newspaper: { iconoir: ["Newspaper"] },
  paintbrush: {
    phosphor: ["PaintBrush"],
    heroicons: ["PaintBrushIcon"],
    remix: ["RiBrushLine"],
    iconoir: ["Palette"],
  },
  "panel-left": {
    phosphor: ["SidebarSimple"],
    remix: ["RiLayoutLeftLine", "RiSideBarLine"],
    iconoir: ["SidebarCollapse"],
  },
  pencil: { iconoir: ["EditPencil"] },
  "pencil-ruler": {
    heroicons: ["PencilSquareIcon"],
    iconoir: ["DesignPencil"],
  },
  percent: { iconoir: ["Percentage"] },
  plus: { remix: ["RiAddLine"] },
  "plus-circle": {
    phosphor: ["PlusCircle"],
    heroicons: ["PlusCircleIcon"],
    remix: ["RiAddCircleLine"],
    iconoir: ["PlusCircle"],
  },
  power: { remix: ["RiShutDownLine"] },
  "power-off": {
    phosphor: ["Power"],
    heroicons: ["PowerIcon"],
    remix: ["RiShutDownLine"],
  },
  "refresh-ccw": {
    phosphor: ["ArrowsCounterClockwise"],
    heroicons: ["ArrowPathIcon"],
    remix: ["RiResetLeftLine", "RiRefreshLine"],
    iconoir: ["RefreshDouble", "Refresh"],
  },
  "refresh-cw": {
    phosphor: ["ArrowsClockwise"],
    heroicons: ["ArrowPathIcon"],
    remix: ["RiRefreshLine"],
    iconoir: ["Refresh", "RefreshDouble"],
  },
  repeat: { heroicons: ["ArrowPathRoundedSquareIcon"] },
  "rotate-ccw": {
    phosphor: ["ArrowCounterClockwise"],
    heroicons: ["ArrowUturnLeftIcon"],
    remix: ["RiAnticlockwise2Line", "RiArrowGoBackLine"],
    iconoir: ["Undo"],
  },
  "rotate-cw": {
    phosphor: ["ArrowClockwise"],
    heroicons: ["ArrowUturnRightIcon"],
    remix: ["RiClockwise2Line", "RiArrowGoForwardLine"],
    iconoir: ["Redo"],
  },
  rss: { iconoir: ["RssFeed"] },
  "scroll-text": {
    phosphor: ["Scroll"],
    heroicons: ["DocumentTextIcon"],
    remix: ["RiFileList3Line"],
  },
  send: {
    phosphor: ["PaperPlaneTilt"],
    heroicons: ["PaperAirplaneIcon"],
    remix: ["RiSendPlaneLine", "RiSendPlane2Line"],
  },
  server: { phosphor: ["HardDrives"] },
  "settings-2": {
    phosphor: ["SlidersHorizontal", "Sliders"],
    heroicons: ["AdjustmentsHorizontalIcon"],
  },
  shield: { heroicons: ["ShieldCheckIcon"] },
  "sliders-horizontal": {
    heroicons: ["AdjustmentsHorizontalIcon"],
    remix: ["RiEqualizerLine"],
  },
  sparkles: {
    phosphor: ["Sparkle"],
    remix: ["RiSparklingLine", "RiSparkling2Line"],
    iconoir: ["Sparks"],
  },
  square: { heroicons: ["StopIcon"] },
  sun: { iconoir: ["SunLight"] },
  tag: { remix: ["RiPriceTag3Line"], iconoir: ["Label", "PriceTag"] },
  terminal: { heroicons: ["CommandLineIcon"] },
  type: { phosphor: ["TextT"], remix: ["RiText", "RiFontSize"] },
  upload: { heroicons: ["ArrowUpTrayIcon"] },
  "user-plus": { remix: ["RiUserAddLine"] },
  users: { remix: ["RiGroupLine"], iconoir: ["Group", "Community"] },
  video: { heroicons: ["VideoCameraIcon"], iconoir: ["VideoCamera"] },
  wand: {
    phosphor: ["MagicWand"],
    heroicons: ["SparklesIcon"],
    remix: ["RiMagicLine"],
    iconoir: ["MagicWand"],
  },
  "wifi-off": { phosphor: ["WifiSlash"] },
  zap: {
    phosphor: ["Lightning"],
    heroicons: ["BoltIcon"],
    remix: ["RiFlashlightLine"],
    iconoir: ["Flash"],
  },
  "maximize-2": {
    phosphor: ["ArrowsOutSimple"],
    heroicons: ["ArrowsPointingOutIcon"],
    remix: ["RiExpandDiagonalLine", "RiFullscreenLine"],
    iconoir: ["Expand"],
  },
  brain: { phosphor: ["Brain"], iconoir: ["Brain"] },
  "credit-card": { remix: ["RiBankCardLine"] },
  shuffle: { remix: ["RiShuffleLine"], iconoir: ["Shuffle"] },
  x: { heroicons: ["XMarkIcon"], remix: ["RiCloseLine"], iconoir: ["Xmark"] },
  search: { phosphor: ["MagnifyingGlass"], heroicons: ["MagnifyingGlassIcon"] },
  settings: { phosphor: ["Gear"], heroicons: ["Cog6ToothIcon"] },
  trash: { remix: ["RiDeleteBinLine"] },
  "trash-2": { remix: ["RiDeleteBin2Line"] },
};
OVERRIDES.loader = {
  ...OVERRIDES.loader,
  phosphor: ["Spinner"],
  iconoir: ["RefreshDouble"],
};
OVERRIDES.percent = { ...OVERRIDES.percent, heroicons: ["PercentBadgeIcon"] };
OVERRIDES["arrow-up-down"] = {
  ...OVERRIDES["arrow-up-down"],
  iconoir: ["DataTransferBoth"],
};
OVERRIDES["chevrons-up-down"] = {
  ...OVERRIDES["chevrons-up-down"],
  iconoir: ["ArrowSeparateVertical"],
};
OVERRIDES["chevrons-down-up"] = {
  ...OVERRIDES["chevrons-down-up"],
  iconoir: ["ArrowUnionVertical"],
};

const stripNum = (b: string) => b.replace(/[0-9]+$/, "");

function pick(set: Set<string>, cands: (string | null | undefined)[]) {
  return cands.find((c): c is string => !!c && set.has(c)) ?? null;
}

function resolve(e: Entry) {
  const b = e.lu;
  const o = OVERRIDES[e.key] ?? {};
  return {
    phosphor: pick(phosphorSet, [
      ...(o.phosphor ?? []),
      b,
      b && stripNum(b),
      b && b + "Simple",
    ]),
    heroicons: pick(heroSet, [
      ...(o.heroicons ?? []),
      b && b + "Icon",
      b && stripNum(b) + "Icon",
    ]),
    remix: pick(remixSet, [
      ...(o.remix ?? []),
      b && "Ri" + b + "Line",
      b && "Ri" + stripNum(b) + "Line",
      b && "Ri" + b + "Fill",
    ]),
    iconoir: pick(iconoirSet, [...(o.iconoir ?? []), b, b && stripNum(b)]),
  };
}

const lines: string[] = [];
const misses: Record<string, string[]> = {
  lucide: [],
  tabler: [],
  phosphor: [],
  heroicons: [],
  remix: [],
  iconoir: [],
};

for (const e of entries) {
  const parts: string[] = [];

  if (e.localLucide) {
    parts.push(
      `    lucide: () =>\n      import("@/components/ui/local-icons").then((m) => ({\n        default: m.${e.localLucide},\n      })),`,
    );
  } else if (e.lu) {
    const file =
      LUCIDE_FILE_OVERRIDES[e.lu] ??
      (lucideSet.has(kebab(e.lu)) ? kebab(e.lu) : null);
    if (file) {
      parts.push(
        `    lucide: () => import("lucide-react/dist/esm/icons/${file}.mjs"),`,
      );
    } else if (LUCIDE_LOCAL_FALLBACK[e.lu]) {
      parts.push(
        `    lucide: () =>\n      import("@/components/ui/local-icons").then((m) => ({\n        default: m.${LUCIDE_LOCAL_FALLBACK[e.lu]},\n      })),`,
      );
    } else misses.lucide.push(`${e.key}(${e.lu})`);
  }

  if (e.localTabler) {
    parts.push(
      `    tabler: () =>\n      import("@/components/ui/local-icons").then((m) => ({\n        default: m.${e.localTabler},\n      })),`,
    );
  } else if (e.tb) {
    const file =
      TABLER_FILE_OVERRIDES[e.tb] ??
      (tablerSet.has("Icon" + e.tb) ? "Icon" + e.tb : null);
    if (file) {
      parts.push(
        `    tabler: () =>\n      import("@tabler/icons-react/dist/esm/icons/${file}.mjs"),`,
      );
    } else misses.tabler.push(`${e.key}(${e.tb})`);
  }

  const r = resolve(e);
  if (r.phosphor) {
    parts.push(
      `    phosphor: () =>\n      import("@phosphor-icons/react/dist/ssr/${r.phosphor}").then((m) => ({\n        default: m.${r.phosphor} as IconComponent,\n      })),`,
    );
  } else misses.phosphor.push(e.key);
  if (r.heroicons) {
    parts.push(
      `    heroicons: () => import("@heroicons/react/24/outline/${r.heroicons}"),`,
    );
  } else misses.heroicons.push(e.key);
  if (r.remix) {
    parts.push(
      `    remix: () =>\n      import("@remixicon/react").then((m) => ({\n        default: m.${r.remix} as unknown as IconComponent,\n      })),`,
    );
  } else misses.remix.push(e.key);
  if (r.iconoir) {
    parts.push(
      `    iconoir: () => import("iconoir-react/regular/${r.iconoir}"),`,
    );
  } else misses.iconoir.push(e.key);

  const key = /^[a-z0-9]+$/.test(e.key) ? e.key : `"${e.key}"`;
  lines.push(`  ${key}: {\n${parts.join("\n")}\n  },`);
}

const out = `// Per-icon dynamic loaders; each icon enters the chunk graph only on first
// render, per library. A missing lib key falls back to lucide at runtime
// (icon.tsx). GENERATED by scripts/generate-icon-map.ts; edit that script
// (BASE/OVERRIDES) and re-run instead of editing entries here.

export type IconLibraryName =
  | "lucide"
  | "tabler"
  | "phosphor"
  | "heroicons"
  | "remix"
  | "iconoir";

export type IconComponent = React.ComponentType<
  React.SVGAttributes<SVGElement> & { size?: number | string }
>;

export type IconLoader = () => Promise<{ default: IconComponent }>;

export type IconEntry = Partial<Record<IconLibraryName, IconLoader>>;

export const ICON_MAP: Record<string, IconEntry> = {
${lines.join("\n")}
};

export type IconName = keyof typeof ICON_MAP;
`;

await writeFile("src/lib/config/icon-map.ts", out, "utf8");
console.log(`wrote ${entries.length} entries`);
for (const [lib, m] of Object.entries(misses)) {
  console.log(`${lib}: ${entries.length - m.length} hits, ${m.length} misses`);
  if (m.length) console.log("  " + m.join(" "));
}
