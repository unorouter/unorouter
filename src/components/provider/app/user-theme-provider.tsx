"use client";

import {
  findBaseColor,
  findRadius,
  findTheme,
  type ThemeCssVars,
} from "@/lib/config/shadcn-themes";
import { findStyle } from "@/lib/config/shadcn-styles";
import { FONT_OPTIONS } from "@/lib/config/theme-fonts";
import type { UserTheme } from "@/store/theme-store";
import { userThemeAtom } from "@/store/theme-store";
import { useAtomValue } from "jotai";
import { ReactNode, useEffect, useMemo } from "react";

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

  // Font overrides written w/ body selector to outrank Next/font className
  // declarations. Both family vars resolve at body level so Tailwind
  // `font-sans` utility on body picks them up.
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
  ]
    .filter(Boolean)
    .join("\n");
}

export function UserThemeProvider(props: { children: ReactNode }) {
  const theme = useAtomValue(userThemeAtom);
  const css = useMemo(() => buildThemeCss(theme), [theme]);

  // Mirror named refs onto <html> so CSS can target via data-attr selectors.
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.style = theme.style ?? "nova";
    el.dataset.menu = theme.menu ?? "default";
    el.dataset.menuAccent = theme.menuAccent ?? "subtle";
    el.dataset.iconLibrary = theme.iconLibrary ?? "lucide";
  }, [theme.style, theme.menu, theme.menuAccent, theme.iconLibrary]);


  return (
    <>
      {css ? (
        <style id="user-theme" dangerouslySetInnerHTML={{ __html: css }} />
      ) : null}
      {props.children}
    </>
  );
}
