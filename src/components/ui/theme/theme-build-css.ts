import {
  findBaseColor,
  findRadius,
  findTheme,
  type ThemeCssVars,
} from "@/components/ui/theme/shadcn-themes";
import { findStyle } from "@/components/ui/theme/shadcn-styles";
import { FONT_OPTIONS } from "@/components/ui/theme/theme-fonts";
import {
  normalizeSurface,
  type BackgroundSettings,
  type SurfaceColors,
  type UserTheme,
} from "@/components/ui/theme/theme-store";

function fontFamilyFor(
  fontId: string | undefined,
  kind: "sans" | "mono" | "display",
): string | null {
  if (!fontId || fontId === "inherit") return null;
  const opt = FONT_OPTIONS.find(
    (f) => f.id === fontId && f.kinds.includes(kind),
  );
  if (!opt) return null;
  const fallback =
    kind === "mono" ? "ui-monospace, monospace" : "ui-sans-serif, system-ui";
  return `var(${opt.varName}), ${fallback}`;
}

function mergeVars(
  base: ThemeCssVars,
  accent: ThemeCssVars,
  chart: ThemeCssVars,
): ThemeCssVars {
  return { ...base, ...accent, ...chart };
}

function emitBlock(selector: string, vars: ThemeCssVars): string {
  const entries = Object.entries(vars)
    .filter(([, v]) => Boolean(v))
    .map(([k, v]) => `--${k}: ${v};`)
    .join("");
  return entries ? `${selector}{${entries}}` : "";
}

function pickChartVars(vars: ThemeCssVars): ThemeCssVars {
  const out: ThemeCssVars = {};
  for (const k of Object.keys(vars)) {
    if (k.startsWith("chart-")) out[k] = vars[k];
  }
  return out;
}

function styleVarsBlock(name: string | undefined): string {
  const style = findStyle(name);
  if (!style) return "";
  return [
    `:root{`,
    `--style-radius-scale: ${style.radiusScale};`,
    `--style-shadow: ${style.shadow};`,
    `--style-border-opacity: ${style.borderOpacity};`,
    `--style-hover-lift: ${style.hoverLift}px;`,
    `}`,
  ].join("");
}

function menuBlock(
  name: string | undefined,
  hasCustomForeground: boolean,
): string {
  if (!name || name === "default") return "";
  // "Inverted" paints the menu with --foreground. Foreground is OPTIONAL in the
  // customizer, and its default is near-white in dark mode, so a user who
  // themed everything EXCEPT foreground got a white menu that ignored their
  // Card colour and matched no control they had touched. Only invert against a
  // foreground the user actually chose; otherwise fall back to the normal menu
  // surface so the menu tracks the rest of the theme.
  const invertSurface = hasCustomForeground
    ? "var(--foreground)"
    : "var(--popover)";
  const invertText = hasCustomForeground
    ? "var(--background)"
    : "var(--popover-foreground)";
  // Submenus render through DropdownMenuContent but override data-slot to
  // `dropdown-menu-sub-content` (the spread lands after the hardcoded
  // attribute), so a selector listing only `dropdown-menu-content` styled the
  // parent and skipped its own submenu: an inverted theme produced a white menu
  // with a black submenu hanging off it.
  const selectors =
    "[data-slot=dropdown-menu-content],[data-slot=dropdown-menu-sub-content],[data-slot=popover-content]";
  const inverted = name === "inverted" || name === "inverted-translucent";
  const translucent =
    name === "default-translucent" || name === "inverted-translucent";
  const rules: string[] = [];
  if (inverted) {
    rules.push(
      ...(hasCustomForeground ? ["color-scheme: dark;"] : []),
      `background-color: ${invertSurface};`,
      `color: ${invertText};`,
      `border-color: color-mix(in srgb, ${invertText} 15%, transparent);`,
    );
  }
  if (translucent) {
    rules.push(
      "background-color: color-mix(in srgb, " +
        (inverted ? invertSurface : "var(--popover)") +
        " 75%, transparent);",
      "backdrop-filter: blur(12px);",
    );
  }
  return rules.length ? `${selectors}{${rules.join("")}}` : "";
}

function menuAccentBlock(name: string | undefined): string {
  if (!name || name === "subtle") return "";
  if (name === "bold") {
    // Sub-triggers ("Appearance >") carry their own data-slot, so listing only
    // dropdown-menu-item left the one row a user is most likely to be hovering
    // unaccented.
    const rows = [
      "[data-slot=dropdown-menu-item]",
      "[data-slot=dropdown-menu-sub-trigger]",
    ];
    const states = ["[data-highlighted=true]", "[data-state=open]"];
    const selectors = rows
      .flatMap((row) => states.map((state) => `${row}${state}`))
      .join(",");
    return `${selectors}{background-color: var(--primary);color: var(--primary-foreground);}`;
  }
  return "";
}

function markdownBlock(md: UserTheme["markdown"]): string {
  if (!md) return "";
  const vars: ThemeCssVars = {};
  if (md.normal) vars["md-normal"] = md.normal;
  if (md.italic) vars["md-italic"] = md.italic;
  if (md.bold) vars["md-bold"] = md.bold;
  if (md.italicBold) vars["md-italic-bold"] = md.italicBold;
  if (md.singleQuote) vars["md-single-quote"] = md.singleQuote;
  if (md.doubleQuote) vars["md-double-quote"] = md.doubleQuote;
  const varsBlock = emitBlock(":root", vars);
  // Apply vars via CSS so nested italic+bold (<strong><em>) gets its own slot.
  // Plain text falls through to inherited foreground when md-normal unset.
  const rules: string[] = [];
  if (md.normal) rules.push(".aui-md p,.aui-md li{color:var(--md-normal);}");
  if (md.italic) rules.push(".aui-md em{color:var(--md-italic);}");
  if (md.bold) rules.push(".aui-md strong{color:var(--md-bold);}");
  if (md.italicBold)
    rules.push(
      ".aui-md strong em,.aui-md em strong{color:var(--md-italic-bold);}",
    );
  if (md.singleQuote)
    rules.push(".aui-md [data-md-quote=sq]{color:var(--md-single-quote);}");
  if (md.doubleQuote)
    rules.push(".aui-md [data-md-quote=dq]{color:var(--md-double-quote);}");
  return [varsBlock, ...rules].filter(Boolean).join("");
}

function surfaceVars(surface: SurfaceColors | undefined): ThemeCssVars {
  const vars: ThemeCssVars = {};
  if (!surface) return vars;
  if (surface.background) vars.background = surface.background;
  if (surface.foreground) vars.foreground = surface.foreground;
  if (surface.card) {
    vars.card = surface.card;
    vars.popover = surface.card;
  }
  if (surface.primary) {
    vars.primary = surface.primary;
    vars.ring = surface.primary;
  }
  if (surface.accent) vars.accent = surface.accent;
  if (surface.muted) vars.muted = surface.muted;
  if (surface.border) {
    vars.border = surface.border;
    vars.input = surface.border;
  }
  if (surface.sidebar) vars.sidebar = surface.sidebar;
  return vars;
}

// Whether the user picked a foreground at all. Foreground is optional, and the
// inverted menu style is the one place that reads it as a SURFACE, so it must
// know the difference between "chosen" and "defaulted".
function hasCustomForeground(surface: UserTheme["surface"]): boolean {
  const palette = normalizeSurface(surface);
  return !!(palette.light?.foreground || palette.dark?.foreground);
}

function surfaceBlock(surface: UserTheme["surface"]): string {
  const palette = normalizeSurface(surface);
  return [
    emitBlock(":root", surfaceVars(palette.light)),
    emitBlock(".dark", surfaceVars(palette.dark)),
  ]
    .filter(Boolean)
    .join("");
}

const HEX_RE = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

function normHex(v: string | undefined): string | null {
  if (!v) return null;
  const m = HEX_RE.exec(v.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  return `#${h.toLowerCase()}`;
}

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

function chartShades(hex: string, dark: boolean): ThemeCssVars {
  const lift = dark ? "white" : "black";
  const drop = dark ? "black" : "white";
  return {
    "chart-1": `color-mix(in oklab, ${hex} 55%, ${lift})`,
    "chart-2": `color-mix(in oklab, ${hex} 78%, ${lift})`,
    "chart-3": hex,
    "chart-4": `color-mix(in oklab, ${hex} 78%, ${drop})`,
    "chart-5": `color-mix(in oklab, ${hex} 55%, ${drop})`,
  };
}

function customVars(theme: UserTheme, dark: boolean): ThemeCssVars {
  const out: ThemeCssVars = {};
  if (theme.baseColor === "custom") {
    const bg = normHex(theme.baseColorCustom);
    if (bg) {
      out.background = bg;
      out.foreground = isLight(bg) ? "#0a0a0a" : "#fafafa";
    }
  }
  if (theme.theme === "custom") {
    const p = normHex(theme.themeCustom);
    if (p) {
      out.primary = p;
      out.ring = p;
      out["sidebar-primary"] = p;
      out["primary-foreground"] = isLight(p) ? "#0a0a0a" : "#fafafa";
    }
  }
  if (theme.chartColor === "custom") {
    const c = normHex(theme.chartColorCustom);
    if (c) Object.assign(out, chartShades(c, dark));
  }
  return out;
}

function customBlock(theme: UserTheme): string {
  return [
    emitBlock(":root", customVars(theme, false)),
    emitBlock(".dark", customVars(theme, true)),
  ]
    .filter(Boolean)
    .join("");
}

export function buildThemeCss(theme: UserTheme): string {
  const baseColor = findBaseColor(theme.baseColor) ?? findBaseColor("neutral");
  if (!baseColor) return "";
  const accent = findTheme(theme.theme) ?? baseColor;
  const chart = findTheme(theme.chartColor) ?? baseColor;
  const radius = findRadius(theme.radius);

  const light = mergeVars(
    baseColor.cssVars.light,
    accent.cssVars.light,
    pickChartVars(chart.cssVars.light),
  );
  const dark = mergeVars(
    baseColor.cssVars.dark,
    accent.cssVars.dark,
    pickChartVars(chart.cssVars.dark),
  );

  if (radius && radius.value !== "") {
    light.radius = radius.value;
  }

  const bodyFamily = fontFamilyFor(theme.fontBody, "sans");
  const headingBody =
    theme.fontHeading === "inherit" ? theme.fontBody : theme.fontHeading;
  const headingFamily = fontFamilyFor(headingBody, "display");
  const fontVars: ThemeCssVars = {};
  if (bodyFamily) fontVars["font-sans"] = `${bodyFamily} !important`;
  if (headingFamily) fontVars["font-display"] = `${headingFamily} !important`;
  const bodyFontBlock = emitBlock("body", fontVars);

  return [
    emitBlock(":root", light),
    emitBlock(".dark", dark),
    customBlock(theme),
    styleVarsBlock(theme.style),
    bodyFontBlock,
    menuBlock(theme.menu, hasCustomForeground(theme.surface)),
    menuAccentBlock(theme.menuAccent),
    markdownBlock(theme.markdown),
    chatFontSizeBlock(theme.chatFontScale),
    assetImageWidthBlock(theme.assetImageMaxWidth),
    surfaceBlock(theme.surface),
  ]
    .filter(Boolean)
    .join("\n");
}

function chatFontSizeBlock(scale: number | undefined): string {
  if (!scale || scale === 1) return "";
  const s = Math.max(0.5, Math.min(3, scale));
  return `:root{--chat-font-scale:${s};}.aui-md,.aui-user-message-content{font-size:calc(1em * var(--chat-font-scale,1));}`;
}

function assetImageWidthBlock(rem: number | undefined): string {
  if (!rem) return "";
  const w = Math.max(2, Math.min(64, rem));
  return `:root{--asset-img-max-width:${w}rem;}.aui-md img[data-asset]{max-width:min(100%,var(--asset-img-max-width));}`;
}

export function buildBackgroundCss(
  image: string | null,
  bg: BackgroundSettings | undefined,
): string {
  if (!image || bg?.enabled === false) return "";
  const fit = bg?.fit ?? "cover";
  const opacity = bg?.opacity ?? 1;
  const blur = bg?.blur ?? 0;
  const panelOpacity = Math.min(1, Math.max(0, bg?.panelOpacity ?? 0.75));
  const pct = Math.round(panelOpacity * 100);
  const sizeRule =
    fit === "tile"
      ? "background-repeat:repeat;background-size:auto;"
      : `background-repeat:no-repeat;background-size:${fit};`;
  const safeUrl = image.replace(/["\\]/g, "");
  const surfaceMix = (varName: string) =>
    `color-mix(in srgb, var(--${varName}) ${pct}%, transparent)`;
  const translucent =
    panelOpacity < 1
      ? [
          `[data-bg-active] .bg-background{background-color:${surfaceMix("background")} !important;backdrop-filter:blur(8px);}`,
          `[data-bg-active] .bg-sidebar{background-color:${surfaceMix("sidebar")} !important;backdrop-filter:blur(8px);}`,
          `[data-bg-active] .bg-card{background-color:${surfaceMix("card")} !important;}`,
          `[data-bg-active] .bg-muted{background-color:${surfaceMix("muted")} !important;}`,
          // A translucent surface nested in another one multiplies: the chat
          // thread inside <main> left only ~6% of the image visible, and blurred
          // it twice. Inner surfaces defer to the outer one.
          `[data-bg-active] .bg-background .bg-background{background-color:transparent !important;backdrop-filter:none;}`,
          `[data-bg-active] .bg-sidebar .bg-sidebar{background-color:transparent !important;backdrop-filter:none;}`,
        ].join("")
      : "";
  return [
    // Both must be transparent: body::before paints at z-index -1, so any
    // opaque color on html or body renders on top of the image and buries it.
    "html{background-color:transparent !important;}",
    "body{background-color:transparent !important;}",
    "body::before{",
    'content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;',
    `background-image:url("${safeUrl}");background-position:center;`,
    sizeRule,
    `opacity:${opacity};`,
    blur > 0 ? `filter:blur(${blur}px);` : "",
    "}",
    translucent,
  ].join("");
}

export function themeDataAttrs(theme: UserTheme) {
  return {
    "data-style": theme.style ?? "nova",
    "data-menu": theme.menu ?? "default",
    "data-menu-accent": theme.menuAccent ?? "subtle",
    "data-icon-library": theme.iconLibrary ?? "lucide",
  } as const;
}
