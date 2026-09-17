"use client";

import { useEffect } from "react";

// interactive-widget=resizes-content for every engine but WebKit. Chromium
// resizes the layout viewport cleanly for the keyboard, so the dvh shell
// shrinks with no JS. iOS 26 half honours the key: device logs show the layout
// viewport stepping through intermediate heights and parking mid dismiss, which
// strands the composer. WebKit's docs say the key is ignored; the logs disagree,
// and removing this on that reading brought the bug back. Every iOS browser is
// WebKit whatever it calls itself, and iPadOS reports as macOS.
export function InteractiveWidgetMeta() {
  useEffect(() => {
    const ua = navigator.userAgent;
    const isIos =
      /iP(hone|ad|od)/.test(ua) ||
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const isWebKit = isIos || (/AppleWebKit/.test(ua) && !/Chrome/.test(ua));
    if (isWebKit) return;
    const meta = document.querySelector('meta[name="viewport"]');
    const content = meta?.getAttribute("content");
    if (!meta || !content || content.includes("interactive-widget")) return;
    meta.setAttribute(
      "content",
      `${content}, interactive-widget=resizes-content`,
    );
  }, []);

  return null;
}
