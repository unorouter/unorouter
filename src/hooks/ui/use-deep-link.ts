import { useRef, useState } from "react";

    // Blur/visibility heuristic; no reliable protocol-detection API. False positives when the app opens without taking focus.
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

  const openDeepLink = (e: React.MouseEvent, uri: string) => {
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
  };

  return { showInstall, installRef, openDeepLink };
}
