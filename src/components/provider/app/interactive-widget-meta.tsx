"use client";

import { useEffect } from "react";

// Appends interactive-widget=resizes-content to the viewport meta on
// non-WebKit engines only. Chromium resizes the layout viewport cleanly when
// the keyboard opens, so the dvh shell shrinks and the composer rides up with
// no JS. WebKit (iOS/iPadOS) half-honors the attribute: the layout viewport
// animates through intermediate heights and sticks mid-dismiss, cutting the
// composer off, so there the attribute must stay absent and Safari's native
// visual-viewport pan handles the keyboard instead. Engine-detected, not
// device-detected: iPadOS Safari reports itself as macOS in the UA.
export function InteractiveWidgetMeta() {
  useEffect(() => {
    const ua = navigator.userAgent;
    const isWebKit = /AppleWebKit/.test(ua) && !/Chrome|CriOS|EdgiOS/.test(ua);
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
