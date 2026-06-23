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

// The cookie-backed theme CSS is SSR'd by the layout into #user-theme (authoritative first
// paint, no FOUC). This provider OWNS live updates: it mutates that node's content on every
// theme change (reset/shuffle/import) and re-syncs the <html> data-attrs. The background image
// rides a SEPARATE localStorage atom the server can't know, so its CSS goes in its own
// client-only #user-theme-bg node (mounted here) instead of skewing the SSR theme node.
export function UserThemeProvider(props: { children: React.ReactNode }) {
  const theme = useAtomValue(userThemeAtom);
  const backgroundImage = useAtomValue(themeBackgroundAtom);
  const isFirstRun = useRef(true);

  useEffect(() => {
    // First mount: the SSR theme CSS + <html> attrs already match the cookie, so skip
    // re-applying them (avoids a redundant write). Later changes must re-apply both.
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
    el.textContent = buildBackgroundCss(backgroundImage, theme.background);
  }, [backgroundImage, theme.background]);

  return <>{props.children}</>;
}
