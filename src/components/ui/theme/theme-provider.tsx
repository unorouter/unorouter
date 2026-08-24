"use client";

import {
  buildBackgroundCss,
  buildThemeCss,
  themeDataAttrs,
} from "@/components/ui/theme/theme-build-css";
import {
  themeBackgroundAtom,
  userThemeAtom,
} from "@/components/ui/theme/theme-store";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

const BG_STYLE_ID = "user-theme-bg";

export function UserThemeProvider(props: { children: React.ReactNode }) {
  const theme = useAtomValue(userThemeAtom);
  const backgroundImage = useAtomValue(themeBackgroundAtom);

  // Applies on mount as well: the shell ships the default theme (the server
  // no longer reads the theme cookie), so a custom theme must be applied as
  // soon as the atom hydrates from the client cookie. Idempotent for the
  // default theme.
  useEffect(() => {
    const html = document.documentElement;
    for (const [k, v] of Object.entries(themeDataAttrs(theme))) {
      html.setAttribute(k, v);
    }
    const themeEl = document.getElementById("user-theme");
    if (themeEl) themeEl.textContent = buildThemeCss(theme);
  }, [theme]);

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
