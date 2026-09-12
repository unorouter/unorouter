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
  type SurfaceScope,
  type SurfaceTheme,
  type UserTheme,
} from "@/components/ui/theme/theme-store";

export const CUSTOM_FONT_ID = "custom";

// A theme arrives from pasted JSON with no validation and is compiled into a
// server-rendered <style>, so the stored name must never reach the CSS as
// typed. Anchored allowlist, and the emitted string is rebuilt from the match.
const FAMILY_RE = /^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/;
const FAMILY_MAX = 50;

export function normFontFamily(v: string | undefined): string | null {
  const name = (v ?? "").trim().replace(/[+_]/g, " ").replace(/\s+/g, " ");
  if (!name || name.length > FAMILY_MAX || !FAMILY_RE.test(name)) return null;
  return name;
}

// We build the URL, so only fonts.googleapis.com is ever reachable. The weight
// list is the point: a family loaded at 400 alone leaves every bold synthetic.
// Several families ride one request, since body and heading can each be custom.
export function googleFontHref(
  families: ReadonlyArray<string | undefined>,
): string | null {
  const names: string[] = [];
  for (const f of families) {
    const name = normFontFamily(f);
    if (name && !names.includes(name)) names.push(name);
  }
  if (names.length === 0) return null;
  const query = names
    .map(
      (n) =>
        `family=${encodeURIComponent(n)}:ital,wght@0,400;0,500;0,600;0,700;1,400;1,700`,
    )
    .join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

function fontFamilyFor(
  fontId: string | undefined,
  kind: "sans" | "mono" | "display",
  custom?: string,
): string | null {
  if (!fontId || fontId === "inherit") return null;
  const fallback =
    kind === "mono" ? "ui-monospace, monospace" : "ui-sans-serif, system-ui";
  if (fontId === CUSTOM_FONT_ID) {
    const name = normFontFamily(custom);
    return name ? `"${name}", ${fallback}` : null;
  }
  const opt = FONT_OPTIONS.find(
    (f) => f.id === fontId && f.kinds.includes(kind),
  );
  if (!opt) return null;
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

// The chat selector is a DESCENDANT of :root, so its declarations win inside
// the chat subtree on nesting alone: custom properties inherit, and the nearest
// ancestor that declares one supplies the value. No !important needed.
export const CHAT_SCOPE_ATTR = "data-theme-scope";
const CHAT_SELECTOR = `[${CHAT_SCOPE_ATTR}="chat"]`;

function surfaceBlock(
  surface: SurfaceTheme | undefined,
  scope: SurfaceScope,
): string {
  const palette = normalizeSurface(surface);
  const [light, dark] =
    scope === "chat"
      ? [CHAT_SELECTOR, `.dark ${CHAT_SELECTOR}`]
      : [":root", ".dark"];
  return [
    emitBlock(light, surfaceVars(palette.light)),
    emitBlock(dark, surfaceVars(palette.dark)),
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

  const bodyFamily = fontFamilyFor(
    theme.fontBody,
    "sans",
    theme.fontBodyCustom,
  );
  const inheritHeading = theme.fontHeading === "inherit";
  const headingBody = inheritHeading ? theme.fontBody : theme.fontHeading;
  const headingFamily = fontFamilyFor(
    headingBody,
    "display",
    inheritHeading ? theme.fontBodyCustom : theme.fontHeadingCustom,
  );
  const monoFamily = fontFamilyFor(theme.fontMono, "mono");
  const fontVars: ThemeCssVars = {};
  if (bodyFamily) fontVars["font-sans"] = `${bodyFamily} !important`;
  if (headingFamily) fontVars["font-display"] = `${headingFamily} !important`;
  if (monoFamily) fontVars["font-mono"] = `${monoFamily} !important`;
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
    chatFontWeightBlock(theme.chatFontWeight),
    assetImageWidthBlock(theme.assetImageMaxWidth),
    chatAvatarScaleBlock(theme.chatAvatarScale),
    surfaceBlock(theme.surface, "app"),
    // After the app block, so a chat override wins on order as well as nesting.
    surfaceBlock(theme.chatSurface, "chat"),
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

// `strong` is set explicitly rather than left to Preflight's `font-weight:
// bolder`, which is relative and jumps 600 straight to 900: a weight almost no
// family ships, so the browser synthesises it right back.
const WEIGHT_STEPS = [400, 500, 600, 700];
const BOLD_LIFT = 200;
function chatFontWeightBlock(weight: number | undefined): string {
  if (!weight || weight === 400) return "";
  const w = WEIGHT_STEPS.includes(weight) ? weight : 400;
  if (w === 400) return "";
  return `.aui-md p,.aui-md li{font-weight:${w};}.aui-md strong{font-weight:${Math.min(900, w + BOLD_LIFT)};}`;
}

// Always emitted: the in-chat avatars size themselves from these variables, so
// an absent scale must still resolve to the 1.25rem / 1.75rem defaults.
function chatAvatarScaleBlock(scale: number | undefined): string {
  const s = Math.max(1, Math.min(3, scale ?? 1));
  return `:root{--chat-avatar-sm:${1.25 * s}rem;--chat-avatar-md:${1.75 * s}rem;}`;
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
  // Frost on the panels, independent of the image blur above. 8 keeps the look
  // every existing theme was built against; 0 makes the surfaces plain glass so
  // a sharp wallpaper stays sharp through them.
  const panelBlur = Math.min(24, Math.max(0, bg?.panelBlur ?? 8));
  const frost = (scale = 1) =>
    panelBlur > 0
      ? `backdrop-filter:blur(${(panelBlur * scale).toFixed(1)}px);`
      : "";
  const panelOpacity = Math.min(1, Math.max(0, bg?.panelOpacity ?? 0.75));
  const pct = Math.round(panelOpacity * 100);
  const bubbleOpacity = Math.min(
    1,
    Math.max(0, bg?.bubbleOpacity ?? panelOpacity),
  );
  const bubblePct = Math.round(bubbleOpacity * 100);
  const composerOpacity = Math.min(
    1,
    Math.max(0, bg?.composerOpacity ?? panelOpacity),
  );
  const composerPct = Math.round(composerOpacity * 100);
  const sizeRule =
    fit === "tile"
      ? "background-repeat:repeat;background-size:auto;"
      : `background-repeat:no-repeat;background-size:${fit};`;
  const safeUrl = image.replace(/["\\]/g, "");
  const surfaceMix = (varName: string) =>
    `color-mix(in srgb, var(--${varName}) ${pct}%, transparent)`;
  const composerMix = (varName: string) =>
    `color-mix(in srgb, var(--${varName}) ${composerPct}%, transparent)`;
  const bubbleMix = (varName: string) =>
    `color-mix(in srgb, var(--${varName}) ${bubblePct}%, transparent)`;
  // Switch and slider thumbs fill themselves with .bg-background, but a knob is
  // not a surface: the nested reset below painted them fully transparent, so a
  // toggle over a wallpaper rendered as a bare coloured pill with no knob.
  const notKnob =
    ':not([data-slot="switch-thumb"]):not([data-slot="slider-thumb"])';
  const translucent =
    panelOpacity < 1
      ? [
          `[data-bg-active] .bg-background${notKnob}{background-color:${surfaceMix("background")} !important;${frost()}}`,
          `[data-bg-active] .bg-sidebar{background-color:${surfaceMix("sidebar")} !important;${frost()}}`,
          `[data-bg-active] .bg-card{background-color:${surfaceMix("card")} !important;}`,
          `[data-bg-active] .bg-muted{background-color:${surfaceMix("muted")} !important;}`,
          // A translucent surface nested in another one multiplies: the chat
          // thread inside <main> left only ~6% of the image visible, and blurred
          // it twice. Inner surfaces defer to the outer one.
          `[data-bg-active] .bg-background .bg-background${notKnob}{background-color:transparent !important;backdrop-filter:none;}`,
          `[data-bg-active] .bg-sidebar .bg-sidebar{background-color:transparent !important;backdrop-filter:none;}`,
          // The sidebar's 1px border sits outside its panel's painted area, so
          // that column showed the image raw and unblurred against the frosted
          // panels either side of it. The container covers the border box, so
          // the panel inside it must not tint the same pixels twice.
          `[data-bg-active] [data-slot="sidebar-container"]{background-color:${surfaceMix("sidebar")};${frost()}}`,
          `[data-bg-active] [data-slot="sidebar-container"] .bg-sidebar{background-color:transparent !important;backdrop-filter:none;}`,
        ].join("")
      : "";
  // Separate from the panel block: a user can want solid panels with see-through
  // bubbles, or the reverse, so this rule cannot hang off panelOpacity < 1.
  // Tint only, no backdrop-filter: a long thread paints hundreds of bubbles,
  // and on iOS each blurred one is its own full-resolution GPU surface over
  // the wallpaper. That is what froze whole tabs the moment a chat mounted.
  const bubble =
    bubbleOpacity < 1
      ? `[data-bg-active] .aui-user-message-content,[data-bg-active] .aui-assistant-message-content{background-color:${bubbleMix("muted")} !important;}`
      : "";
  // The reasoning box ships as the `outline` variant: a border and no fill at
  // all. Against a wallpaper that is an empty frame with the artwork running
  // straight through the text. It needs a fill at EVERY bubble opacity, so it
  // cannot hang off the translucent branch above.
  // The collapsed preview fades its cut-off text out at both edges, and that
  // gradient defaults to the PAGE background. Once the box carries its own fill
  // the two colours meet at the edges and the fade reads as a grey haze ringing
  // the panel, so hand it the same colour the box is actually painted with.
  const reasoning = `[data-bg-active] .aui-reasoning-root{background-color:${bubbleMix("muted")} !important;}`;
  // The composer is a .bg-background nested inside the thread's own, so the
  // nested-surface reset above stripped its fill AND its blur, leaving the raw
  // image to run straight through the type area behind the text. It reads as a
  // hole rather than a panel. Frost it explicitly: tinted like a panel, blurred
  // harder than one, so it stays legible over any artwork.
  const composer = [
    // Doubled attribute selector on purpose: the nested-surface reset above is
    // `.bg-background .bg-background` (three classes), which outranks a single
    // attribute selector, so the composer would keep the reset's transparency.
    `[data-bg-active] [data-slot="composer-shell"][data-slot="composer-shell"]{background-color:${composerMix("background")} !important;${panelBlur > 0 ? `backdrop-filter:blur(${(panelBlur * 2).toFixed(1)}px) saturate(1.4) !important;` : ""}}`,
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
