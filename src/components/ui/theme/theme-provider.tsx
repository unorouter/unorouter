"use client";

import {
  buildBackgroundCss,
  buildThemeCss,
  googleFontHref,
  themeDataAttrs,
} from "@/components/ui/theme/theme-build-css";
import {
  themeBackgroundAtom,
  userThemeAtom,
} from "@/components/ui/theme/theme-store";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

const BG_STYLE_ID = "user-theme-bg";
const FONT_LINK_ID = "user-theme-font";

export function UserThemeProvider(props: { children: React.ReactNode }) {
  const theme = useAtomValue(userThemeAtom);
  const backgroundImage = useAtomValue(themeBackgroundAtom);

  // The layout already renders this same CSS from the cookie, so the mount pass
  // rewrites an identical string. It stays because the atom is the live source
  // for customizer edits, which must repaint without a reload.
  useEffect(() => {
    const html = document.documentElement;
    for (const [k, v] of Object.entries(themeDataAttrs(theme))) {
      html.setAttribute(k, v);
    }
    const themeEl = document.getElementById("user-theme");
    if (themeEl) themeEl.textContent = buildThemeCss(theme);
  }, [theme]);

  // The layout renders this link from the cookie too, so a reload paints the
  // custom family on first frame; this keeps customizer edits live.
  useEffect(() => {
    const href =
      googleFontHref(
        theme.fontBody === "custom" ? theme.fontBodyCustom : undefined,
      ) ??
      googleFontHref(
        theme.fontHeading === "custom" ? theme.fontHeadingCustom : undefined,
      );
    const existing = document.getElementById(FONT_LINK_ID);
    if (!href) {
      existing?.remove();
      return;
    }
    if (existing instanceof HTMLLinkElement) {
      if (existing.href !== href) existing.href = href;
      return;
    }
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [
    theme.fontBody,
    theme.fontBodyCustom,
    theme.fontHeading,
    theme.fontHeadingCustom,
  ]);

  useEffect(() => {
    let el = document.getElementById(BG_STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = BG_STYLE_ID;
      document.head.appendChild(el);
    }
    const css = buildBackgroundCss(backgroundImage, theme.background);
    el.textContent = css;
    document.documentElement.toggleAttribute("data-bg-active", Boolean(css));
  }, [backgroundImage, theme.background]);

  return <>{props.children}</>;
}
