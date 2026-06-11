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

const STYLE_ID = "user-theme";

export function UserThemeProvider(props: { children: React.ReactNode }) {
  const theme = useAtomValue(userThemeAtom);
  const backgroundImage = useAtomValue(themeBackgroundAtom);
  const isFirstRun = useRef(true);

  useEffect(() => {
    // First mount: SSR already injected the cookie theme in <head>; only the
    // localStorage background image is missing, so paint it without waiting.
    const html = document.documentElement;
    if (!isFirstRun.current) {
      const attrs = themeDataAttrs(theme);
      for (const [k, v] of Object.entries(attrs)) {
        html.setAttribute(k, v);
      }
    }
    isFirstRun.current = false;
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent =
      buildThemeCss(theme) +
      buildBackgroundCss(backgroundImage, theme.background);
  }, [theme, backgroundImage]);

  return <>{props.children}</>;
}
