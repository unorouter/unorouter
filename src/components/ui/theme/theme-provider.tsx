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
import { useEffect, useRef } from "react";

const BG_STYLE_ID = "user-theme-bg";

export function UserThemeProvider(props: { children: React.ReactNode }) {
  const theme = useAtomValue(userThemeAtom);
  const backgroundImage = useAtomValue(themeBackgroundAtom);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (!isFirstRun.current) {
      const html = document.documentElement;
      for (const [k, v] of Object.entries(themeDataAttrs(theme))) {
        html.setAttribute(k, v);
      }
      const themeEl = document.getElementById("user-theme");
      if (themeEl) themeEl.textContent = buildThemeCss(theme);
    }
    isFirstRun.current = false;
  }, [theme]);

  useEffect(() => {
    let el = document.getElementById(BG_STYLE_ID) as HTMLStyleElement | null;
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
