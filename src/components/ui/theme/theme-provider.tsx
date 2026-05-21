"use client";

import {
  buildThemeCss,
  themeDataAttrs,
} from "@/components/ui/theme/theme-build-css";
import { userThemeAtom } from "@/components/ui/theme/theme-store";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";

const STYLE_ID = "user-theme";

export function UserThemeProvider(props: { children: React.ReactNode }) {
  const theme = useAtomValue(userThemeAtom);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const html = document.documentElement;
    const attrs = themeDataAttrs(theme);
    for (const [k, v] of Object.entries(attrs)) {
      html.setAttribute(k, v);
    }
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = buildThemeCss(theme);
  }, [theme]);

  return <>{props.children}</>;
}
