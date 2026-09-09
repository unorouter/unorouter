"use client";

import { debugFlag } from "@/lib/utils/chat-debug-log";

import {
  buildBackgroundCss,
  buildThemeCss,
  themeDataAttrs,
} from "@/components/ui/theme/theme-build-css";
import {
  themeBackgroundAtom,
  type UserTheme,
  userThemeAtom,
} from "@/components/ui/theme/theme-store";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

const BG_STYLE_ID = "user-theme-bg";

// The other two theme layers that change what gets drawn, switchable on a
// phone the same way as the wallpaper: `?dbg=nofonts` drops the webfonts,
// `?dbg=noscale` drops the chat font and avatar scales.
function withDebugFlags(theme: UserTheme): UserTheme {
  let out = theme;
  if (debugFlag("nofonts")) {
    out = {
      ...out,
      fontBody: "inherit",
      fontHeading: "inherit",
      fontMono: "inherit",
    };
  }
  if (debugFlag("noscale")) {
    out = { ...out, chatFontScale: undefined, chatAvatarScale: undefined };
  }
  return out;
}

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
    if (themeEl) themeEl.textContent = buildThemeCss(withDebugFlags(theme));
  }, [theme]);

  useEffect(() => {
    let el = document.getElementById(BG_STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = BG_STYLE_ID;
      document.head.appendChild(el);
    }
    // `?dbg=nobg` keeps the wallpaper stored but never paints it: the iOS
    // freeze sits in the rendering update, and this is the one theme layer
    // that changes what the compositor has to draw.
    const css = debugFlag("nobg")
      ? ""
      : buildBackgroundCss(backgroundImage, theme.background);
    el.textContent = css;
    document.documentElement.toggleAttribute("data-bg-active", Boolean(css));
  }, [backgroundImage, theme.background]);

  return <>{props.children}</>;
}
