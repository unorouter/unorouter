"use client";

import {
  buildBackgroundCss,
  buildThemeCss,
  googleFontHref,
} from "@/lib/theme/build-css";
import { themeBackgroundAtoms, userThemeAtom } from "@/lib/theme/theme-store";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

const BG_STYLE_ID = "user-theme-bg";
const FONT_LINK_ID = "user-theme-font";

export function UserThemeProvider(props: { children: React.ReactNode }) {
  const theme = useAtomValue(userThemeAtom);
  const appImage = useAtomValue(themeBackgroundAtoms.app);
  const chatImage = useAtomValue(themeBackgroundAtoms.chat);
  const imageImage = useAtomValue(themeBackgroundAtoms.image);

  // The layout already renders this same CSS from the cookie, so the mount pass
  // rewrites an identical string. It stays because the atom is the live source
  // for customizer edits, which must repaint without a reload.
  useEffect(() => {
    const themeEl = document.getElementById("user-theme");
    if (themeEl) themeEl.textContent = buildThemeCss(theme);
  }, [theme]);

  useEffect(() => {
    const href = googleFontHref(theme);
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
  }, [theme]);

  useEffect(() => {
    let el = document.getElementById(BG_STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = BG_STYLE_ID;
      document.head.appendChild(el);
    }
    const css = buildBackgroundCss(theme, {
      app: appImage ?? undefined,
      chat: chatImage ?? undefined,
      image: imageImage ?? undefined,
    });
    el.textContent = css;
    document.documentElement.toggleAttribute("data-bg-active", Boolean(css));
  }, [theme, appImage, chatImage, imageImage]);

  return <>{props.children}</>;
}
