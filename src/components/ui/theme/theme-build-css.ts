import {
  findBaseColor,
  findRadius,
  findTheme,
  type ThemeCssVars,
} from "@/components/ui/theme/shadcn-themes";
import { findStyle } from "@/components/ui/theme/shadcn-styles";
import { FONT_OPTIONS } from "@/components/ui/theme/theme-fonts";
import type { UserTheme } from "@/components/ui/theme/theme-store";

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

function menuBlock(name: string | undefined): string {
  if (!name || name === "default") return "";
  const selectors =
    "[data-slot=dropdown-menu-content],[data-slot=popover-content]";
  const inverted = name === "inverted" || name === "inverted-translucent";
  const translucent =
    name === "default-translucent" || name === "inverted-translucent";
  const rules: string[] = [];
  if (inverted) {
    rules.push(
      "color-scheme: dark;",
      "background-color: var(--foreground);",
      "color: var(--background);",
      "border-color: color-mix(in srgb, var(--background) 15%, transparent);",
    );
  }
  if (translucent) {
    rules.push(
      "background-color: color-mix(in srgb, " +
        (inverted ? "var(--foreground)" : "var(--popover)") +
        " 75%, transparent);",
      "backdrop-filter: blur(12px);",
    );
  }
  return rules.length ? `${selectors}{${rules.join("")}}` : "";
}

function menuAccentBlock(name: string | undefined): string {
  if (!name || name === "subtle") return "";
  if (name === "bold") {
    return "[data-slot=dropdown-menu-item][data-highlighted=true],[data-slot=dropdown-menu-item][data-state=open]{background-color: var(--primary);color: var(--primary-foreground);}";
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
    styleVarsBlock(theme.style),
    bodyFontBlock,
    menuBlock(theme.menu),
    menuAccentBlock(theme.menuAccent),
    markdownBlock(theme.markdown),
  ]
    .filter(Boolean)
    .join("\n");
}

export function themeDataAttrs(theme: UserTheme) {
  return {
    "data-style": theme.style ?? "nova",
    "data-menu": theme.menu ?? "default",
    "data-menu-accent": theme.menuAccent ?? "subtle",
    "data-icon-library": theme.iconLibrary ?? "lucide",
  } as const;
}
