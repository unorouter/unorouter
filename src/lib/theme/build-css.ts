import { FONT_OPTIONS } from "@/lib/theme/fonts";
import {
  accentVars,
  chartShades,
  generatePalette,
  normHex,
} from "@/lib/theme/palette";
import {
  CUSTOM,
  SHADOWS,
  findAccent,
  findPalette,
  findStyle,
  type StylePreset,
} from "@/lib/theme/presets";
import {
  modeValues,
  type ThemeImages,
  type TokenValues,
  type UserTheme,
} from "@/lib/theme/theme-types";
import {
  THEME_SCOPES,
  TOKEN_BY_ID,
  TOKENS,
  type ThemeMode,
  type ThemeScope,
  type TokenDef,
} from "@/lib/theme/tokens";

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

export function customFontName(
  value: string | number | undefined,
): string | null {
  const s = String(value ?? "");
  if (!s.startsWith(`${CUSTOM}:`)) return null;
  return normFontFamily(s.slice(CUSTOM.length + 1));
}

// We build the URL, so only fonts.googleapis.com is ever reachable. The weight
// list is the point: a family loaded at 400 alone leaves every bold synthetic.
export function googleFontHref(theme: UserTheme): string | null {
  const names: string[] = [];
  for (const scope of THEME_SCOPES) {
    const all = modeValues(theme, scope).all ?? {};
    for (const id of ["font-sans", "font-display", "font-mono"]) {
      const name = customFontName(all[id]);
      if (name && !names.includes(name)) names.push(name);
    }
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
  value: string | number | undefined,
  kind: "sans" | "mono" | "display",
): string | null {
  if (value === undefined) return null;
  const fallback =
    kind === "mono" ? "ui-monospace, monospace" : "ui-sans-serif, system-ui";
  const custom = customFontName(value);
  if (custom) return `"${custom}", ${fallback}`;
  const opt = FONT_OPTIONS.find(
    (f) => f.id === value && f.kinds.includes(kind),
  );
  return opt ? `var(${opt.varName}), ${fallback}` : null;
}

function emitBlock(selector: string, vars: TokenValues): string {
  const entries = Object.entries(vars)
    .filter(([, v]) => v !== "" && v !== undefined)
    .map(([k, v]) => `--${k}: ${v};`)
    .join("");
  return entries ? `${selector}{${entries}}` : "";
}

function styleVars(style: StylePreset): TokenValues {
  return {
    radius: style.radius,
    spacing: style.spacing,
    shadow: style.shadow,
    tracking: style.tracking,
  };
}

function hexOf(values: TokenValues | undefined, id: string): string | null {
  return normHex(values?.[id]);
}

// Presets and custom inputs share one path: a base colour becomes the surface
// set, an accent becomes the control set, a chart colour becomes the shades.
function generatorVars(
  presets: UserTheme["presets"] | null,
  explicit: TokenValues,
  mode: ThemeMode,
): TokenValues {
  const light = mode === "light";
  const out: TokenValues = {};
  const palette = presets ? findPalette(presets.palette) : null;
  const paletteBase = hexOf(explicit, "palette-base") ?? palette?.base[mode];
  if (paletteBase) Object.assign(out, generatePalette(paletteBase));

  const accent = presets ? findAccent(presets.accent) : null;
  const accentHex =
    hexOf(explicit, "accent-base") ??
    accent?.hex[mode] ??
    palette?.accent?.[mode];
  if (accentHex) Object.assign(out, accentVars(accentHex));

  const chart = presets ? findAccent(presets.chart) : null;
  const chartHex =
    hexOf(explicit, "chart-base") ?? chart?.hex[mode] ?? accentHex;
  if (chartHex) Object.assign(out, chartShades(chartHex, light));
  return out;
}

function tokenCss(def: TokenDef, value: string | number): string {
  if (
    def.kind === "number" &&
    def.unit &&
    def.unit !== "x" &&
    def.unit !== "%"
  ) {
    return `${value}${def.unit}`;
  }
  return String(value);
}

// The variables one scope declares for one mode. Scopes other than app carry
// only their own overrides: inheritance is the cascade's job.
export function resolveVars(
  theme: UserTheme,
  scope: ThemeScope,
  mode: ThemeMode,
): TokenValues {
  const values = modeValues(theme, scope);
  const explicit: TokenValues = {
    ...(values.all ?? {}),
    ...(values[mode] ?? {}),
  };
  const out: TokenValues = {};
  if (scope === "app") {
    const style = findStyle(theme.presets.style);
    if (style) Object.assign(out, styleVars(style));
  }
  Object.assign(
    out,
    generatorVars(scope === "app" ? theme.presets : null, explicit, mode),
  );
  Object.assign(out, explicit);

  const vars: TokenValues = {};
  for (const [id, raw] of Object.entries(out)) {
    const def = TOKEN_BY_ID.get(id);
    if (!def) continue;
    if (def.id === "shadow") {
      const shadow = SHADOWS[String(raw) as keyof typeof SHADOWS];
      if (shadow) {
        for (const size of ["xs", "sm", "md", "lg"])
          vars[`theme-shadow-${size}`] = shadow;
      }
      continue;
    }
    if (def.kind === "font") {
      const kind =
        def.id === "font-mono"
          ? "mono"
          : def.id === "font-display"
            ? "display"
            : "sans";
      const family = fontFamilyFor(raw, kind);
      if (family) vars[def.cssVar!.slice(2)] = family;
      continue;
    }
    if (!def.cssVar || def.group === "generator" || def.group === "wallpaper")
      continue;
    vars[def.cssVar.slice(2)] = tokenCss(def, raw);
  }
  // A body font with no heading font of its own is the heading font too.
  if (vars["font-sans"] && !vars["font-display"])
    vars["font-display"] = vars["font-sans"];
  return vars;
}

const CHAT_SCOPE_ATTR = "data-theme-scope";

function scopeSelector(scope: ThemeScope): string {
  return scope === "app" ? ":root" : `[${CHAT_SCOPE_ATTR}="${scope}"]`;
}

function modeSelector(scope: ThemeScope, mode: ThemeMode): string {
  if (scope === "app") return mode === "light" ? ":root" : ".dark";
  const base = scopeSelector(scope);
  return mode === "light" ? base : `.dark ${base}`;
}

const FONT_IDS = ["font-sans", "font-display", "font-mono"];

function menuBlock(
  values: TokenValues,
  invertAgainstForeground: boolean,
): string {
  const name = String(values.menu ?? "default");
  if (name === "default") return "";
  // Foreground is optional and near-white by default in dark mode, so a menu
  // inverted against it turned white for a user who never chose it.
  const surface = invertAgainstForeground
    ? "var(--foreground)"
    : "var(--popover)";
  const text = invertAgainstForeground
    ? "var(--background)"
    : "var(--popover-foreground)";
  // Submenus override data-slot to `dropdown-menu-sub-content`.
  const selectors =
    "[data-slot=dropdown-menu-content],[data-slot=dropdown-menu-sub-content],[data-slot=popover-content]";
  const inverted = name.startsWith("inverted");
  const translucent = name.endsWith("translucent");
  const rules: string[] = [];
  if (inverted) {
    rules.push(
      ...(invertAgainstForeground ? ["color-scheme: dark;"] : []),
      `background-color: ${surface};`,
      `color: ${text};`,
      `border-color: color-mix(in srgb, ${text} 15%, transparent);`,
    );
  }
  if (translucent) {
    rules.push(
      `background-color: color-mix(in srgb, ${inverted ? surface : "var(--popover)"} 75%, transparent);`,
      "backdrop-filter: blur(12px);",
    );
  }
  return rules.length ? `${selectors}{${rules.join("")}}` : "";
}

function menuAccentBlock(values: TokenValues): string {
  if (values["menu-accent"] !== "bold") return "";
  const rows = [
    "[data-slot=dropdown-menu-item]",
    "[data-slot=dropdown-menu-sub-trigger]",
  ];
  const states = ["[data-highlighted=true]", "[data-state=open]"];
  const selectors = rows
    .flatMap((row) => states.map((s) => `${row}${s}`))
    .join(",");
  return `${selectors}{background-color: var(--primary);color: var(--primary-foreground);}`;
}

export function buildThemeCss(theme: UserTheme): string {
  const blocks: string[] = [];
  for (const scope of THEME_SCOPES) {
    if (scope !== "app" && !theme.scopes[scope]) continue;
    for (const mode of ["light", "dark"] as const) {
      const vars = resolveVars(theme, scope, mode);
      // Mode-less tokens already sit in the light block, which .dark inherits.
      if (mode === "dark") {
        for (const key of Object.keys(vars)) {
          if (!TOKEN_BY_ID.get(key)?.perMode) delete vars[key];
        }
      }
      const fonts: TokenValues = {};
      for (const id of FONT_IDS) {
        if (vars[id] === undefined) continue;
        fonts[id] = vars[id];
        delete vars[id];
      }
      blocks.push(emitBlock(modeSelector(scope, mode), vars));
      // next/font sets --font-* on <body> through its variable class, so the
      // app value must land on body itself; a scope root is already inside it.
      if (mode === "light") {
        const target = scope === "app" ? "body" : scopeSelector(scope);
        const important = scope === "app" ? " !important" : "";
        blocks.push(
          emitBlock(
            target,
            Object.fromEntries(
              Object.entries(fonts).map(([k, v]) => [k, `${v}${important}`]),
            ),
          ),
        );
      }
    }
  }
  const all = theme.global.all ?? {};
  const explicitForeground = Boolean(
    theme.global.light?.foreground || theme.global.dark?.foreground,
  );
  blocks.push(menuBlock(all, explicitForeground), menuAccentBlock(all));
  return blocks.filter(Boolean).join("\n");
}

type Wallpaper = {
  fit: string;
  opacity: number;
  blur: number;
  panelOpacity: number;
  panelBlur: number;
  bubbleOpacity: number;
  composerOpacity: number;
};

function num(v: string | number | undefined, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function wallpaperFor(theme: UserTheme, scope: ThemeScope): Wallpaper {
  const values: TokenValues = {
    ...(theme.global.all ?? {}),
    ...(scope === "app" ? {} : (theme.scopes[scope]?.all ?? {})),
  };
  const panelOpacity = Math.min(
    1,
    Math.max(0, num(values["panel-opacity"], 0.75)),
  );
  return {
    fit: String(values["wallpaper-fit"] ?? "cover"),
    opacity: num(values["wallpaper-opacity"], 1),
    blur: num(values["wallpaper-blur"], 0),
    panelOpacity,
    // 8 keeps the look every existing theme was built against.
    panelBlur: Math.min(24, Math.max(0, num(values["panel-blur"], 8))),
    bubbleOpacity: Math.min(
      1,
      Math.max(0, num(values["bubble-opacity"], panelOpacity)),
    ),
    composerOpacity: Math.min(
      1,
      Math.max(0, num(values["composer-opacity"], panelOpacity)),
    ),
  };
}

function wallpaperOverridden(theme: UserTheme, scope: ThemeScope): boolean {
  if (scope === "app") return false;
  const all = theme.scopes[scope]?.all ?? {};
  return TOKENS.some((t) => t.group === "wallpaper" && all[t.id] !== undefined);
}

function imageRules(scope: ThemeScope, image: string, w: Wallpaper): string {
  const sizeRule =
    w.fit === "tile"
      ? "background-repeat:repeat;background-size:auto;"
      : `background-repeat:no-repeat;background-size:${w.fit};`;
  const safeUrl = image.replace(/["\\]/g, "");
  const host = scope === "app" ? "body" : scopeSelector(scope);
  return [
    `${host}::before{`,
    'content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;',
    `background-image:url("${safeUrl}");background-position:center;`,
    sizeRule,
    `opacity:${w.opacity};`,
    w.blur > 0 ? `filter:blur(${w.blur}px);` : "",
    "}",
  ].join("");
}

function panelRules(scope: ThemeScope, w: Wallpaper): string {
  const at =
    scope === "app"
      ? "[data-bg-active]"
      : `[data-bg-active] ${scopeSelector(scope)}`;
  const pct = Math.round(w.panelOpacity * 100);
  const frost = (scale = 1) =>
    w.panelBlur > 0
      ? `backdrop-filter:blur(${(w.panelBlur * scale).toFixed(1)}px);`
      : "";
  const mix = (varName: string, p: number) =>
    `color-mix(in srgb, var(--${varName}) ${p}%, transparent)`;
  // Switch and slider thumbs fill themselves with .bg-background, but a knob is
  // not a surface.
  const notKnob =
    ':not([data-slot="switch-thumb"]):not([data-slot="slider-thumb"])';
  const translucent =
    w.panelOpacity < 1
      ? [
          `${at} .bg-background${notKnob}{background-color:${mix("background", pct)} !important;${frost()}}`,
          `${at} .bg-sidebar{background-color:${mix("sidebar", pct)} !important;${frost()}}`,
          `${at} .bg-card{background-color:${mix("card", pct)} !important;}`,
          `${at} .bg-muted{background-color:${mix("muted", pct)} !important;}`,
          // A translucent surface nested in another one multiplies; inner
          // surfaces defer to the outer one.
          `${at} .bg-background .bg-background${notKnob}{background-color:transparent !important;backdrop-filter:none;}`,
          `${at} .bg-sidebar .bg-sidebar{background-color:transparent !important;backdrop-filter:none;}`,
          // The sidebar's 1px border sits outside its panel's painted area.
          `${at} [data-slot="sidebar-container"]{background-color:${mix("sidebar", pct)};${frost()}}`,
          `${at} [data-slot="sidebar-container"] .bg-sidebar{background-color:transparent !important;backdrop-filter:none;}`,
        ].join("")
      : "";
  const bubblePct = Math.round(w.bubbleOpacity * 100);
  // Tint only, no backdrop-filter: on iOS each blurred bubble is its own
  // full-resolution GPU surface, and a long thread froze whole tabs.
  const bubble =
    w.bubbleOpacity < 1
      ? `${at} .aui-user-message-content,${at} .aui-assistant-message-content{background-color:${mix("muted", bubblePct)} !important;}`
      : "";
  // The reasoning box ships as the outline variant with no fill, so it needs
  // one at every bubble opacity.
  const reasoning = `${at} .aui-reasoning-root{background-color:${mix("muted", bubblePct)} !important;}`;
  const composerPct = Math.round(w.composerOpacity * 100);
  const composer = [
    // Doubled attribute selector on purpose: it must outrank the
    // three-class nested-surface reset above.
    `${at} [data-slot="composer-shell"][data-slot="composer-shell"]{background-color:${mix("background", composerPct)} !important;${w.panelBlur > 0 ? `backdrop-filter:blur(${(w.panelBlur * 2).toFixed(1)}px) saturate(1.4) !important;` : ""}}`,
    `${at} .aui-thread-viewport-footer{background-color:transparent !important;backdrop-filter:none;}`,
  ].join("");
  return translucent + bubble + reasoning + composer;
}

export function buildBackgroundCss(
  theme: UserTheme,
  images: ThemeImages,
): string {
  const active = THEME_SCOPES.some((s) => images[s]);
  if (!active) return "";
  const blocks: string[] = [
    // Both must be transparent: body::before paints at z-index -1, so any
    // opaque color on html or body renders on top of the image and buries it.
    "html{background-color:transparent !important;}",
    "body{background-color:transparent !important;}",
  ];
  for (const scope of THEME_SCOPES) {
    const image = images[scope];
    const own = Boolean(image) || wallpaperOverridden(theme, scope);
    if (scope === "app" ? !image : !own) continue;
    const w = wallpaperFor(theme, scope);
    if (image) blocks.push(imageRules(scope, image, w));
    blocks.push(panelRules(scope, w));
  }
  return blocks.join("");
}
