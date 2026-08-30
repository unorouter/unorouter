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
  // `.aui-md` renders INSIDE `.aui-user-message-content` (user text goes through
  // the same markdown renderer), and a relative font-size on both compounds:
  // scale 1.2 made user messages 1.44x while assistant messages stayed 1.2x.
  // Scale the user bubble only; the markdown inside it inherits.
  return `:root{--chat-font-scale:${s};}.aui-user-message-content,.aui-md:not(.aui-user-message-content .aui-md){font-size:calc(1em * var(--chat-font-scale,1));}`;
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
  const bubbleOpacity = Math.min(
    1,
    Math.max(0, bg?.bubbleOpacity ?? panelOpacity),
  );
  const bubblePct = Math.round(bubbleOpacity * 100);
  const sizeRule =
    fit === "tile"
      ? "background-repeat:repeat;background-size:auto;"
      : `background-repeat:no-repeat;background-size:${fit};`;
  const safeUrl = image.replace(/["\\]/g, "");
  const surfaceMix = (varName: string) =>
    `color-mix(in srgb, var(--${varName}) ${pct}%, transparent)`;
  const bubbleMix = (varName: string) =>
    `color-mix(in srgb, var(--${varName}) ${bubblePct}%, transparent)`;
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
          // The sidebar's 1px border sits outside its panel's painted area, so
          // that column showed the image raw and unblurred against the frosted
          // panels either side of it. The container covers the border box, so
          // the panel inside it must not tint the same pixels twice.
          `[data-bg-active] [data-slot="sidebar-container"]{background-color:${surfaceMix("sidebar")};backdrop-filter:blur(8px);}`,
          `[data-bg-active] [data-slot="sidebar-container"] .bg-sidebar{background-color:transparent !important;backdrop-filter:none;}`,
        ].join("")
      : "";
  // Separate from the panel block: a user can want solid panels with see-through
  // bubbles, or the reverse, so this rule cannot hang off panelOpacity < 1.
  const bubble =
    bubbleOpacity < 1
      ? `[data-bg-active] .aui-user-message-content{background-color:${bubbleMix("muted")} !important;backdrop-filter:blur(8px);}`
      : "";
  // The reasoning box ships as the `outline` variant: a border and no fill at
  // all. Against a wallpaper that is an empty frame with the artwork running
  // straight through the text. It needs a fill at EVERY bubble opacity, so it
  // cannot hang off the translucent branch above.
  // The collapsed preview fades its cut-off text out at both edges, and that
  // gradient defaults to the PAGE background. Once the box carries its own fill
  // the two colours meet at the edges and the fade reads as a grey haze ringing
  // the panel, so hand it the same colour the box is actually painted with.
  const reasoning = `[data-bg-active] .aui-reasoning-root{background-color:${bubbleMix("muted")} !important;backdrop-filter:blur(8px);}`;
  // The composer is a .bg-background nested inside the thread's own, so the
  // nested-surface reset above stripped its fill AND its blur, leaving the raw
  // image to run straight through the type area behind the text. It reads as a
  // hole rather than a panel. Frost it explicitly: tinted like a panel, blurred
  // harder than one, so it stays legible over any artwork.
  const composer = [
    // Doubled attribute selector on purpose: the nested-surface reset above is
    // `.bg-background .bg-background` (three classes), which outranks a single
    // attribute selector, so the composer would keep the reset's transparency.
    `[data-bg-active] [data-slot="composer-shell"][data-slot="composer-shell"]{background-color:${surfaceMix("background")} !important;backdrop-filter:blur(16px) saturate(1.4) !important;}`,
    // The footer wraps the composer, so tinting both stacks two translucent
    // layers and two blurs over the same pixels. The composer carries the glass;
    // its wrapper defers.
    `[data-bg-active] .aui-thread-viewport-footer{background-color:transparent !important;backdrop-filter:none;}`,
  ].join("");
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
    // After the panel block so a bubble value still wins when both are set.
    bubble,
    reasoning,
    composer,
  ].join("");
}

export function themeDataAttrs(theme: UserTheme) {
  return {
    "data-style": theme.style ?? "nova",
    "data-menu": theme.menu ?? "default",
    "data-menu-accent": theme.menuAccent ?? "subtle",
    "data-icon-library": theme.iconLibrary ?? "lucide",
  };
}
