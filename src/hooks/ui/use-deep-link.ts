import { useCallback, useRef, useState } from "react";

/**
 * Attempts to open a custom protocol URI and detects whether the app handled it.
 * Uses the blur/visibility heuristic: if the page is still visible after a short
 * timeout, the protocol handler is likely not installed.
 *
 * There is no reliable cross-browser API for this. This approach works in most
 * cases but can false-positive when Chrome's "always allow" checkbox is checked
 * (the app opens without stealing focus).
 */
function tryDeepLink(uri: string, onFail: () => void) {
  const start = Date.now();

  function cleanup() {
    window.removeEventListener("blur", handleBlur);
    clearTimeout(timer);
  }

  function handleBlur() {
    cleanup();
  }

  window.addEventListener("blur", handleBlur);
  window.location.href = uri;

  const timer = setTimeout(() => {
    cleanup();
    if (!document.hidden && Date.now() - start < 3000) {
      onFail();
    }
  }, 1500);
}

export function useDeepLink() {
  const [showInstall, setShowInstall] = useState(false);
  const installRef = useRef<HTMLDivElement>(null);

  const openDeepLink = useCallback((e: React.MouseEvent, uri: string) => {
    e.preventDefault();
    tryDeepLink(uri, () => {
      setShowInstall(true);
      setTimeout(() => {
        installRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 50);
    });
  }, []);

  return { showInstall, installRef, openDeepLink };
}
