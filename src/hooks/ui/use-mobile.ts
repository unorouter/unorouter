import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  window.addEventListener("resize", callback);
  return () => {
    mql.removeEventListener("change", callback);
    window.removeEventListener("resize", callback);
  };
}

// Two-phase to avoid a hydration mismatch (React #418): the server and the FIRST
// client render must agree, so both report false (desktop-first). A layout effect
// flips `mounted` right after hydration, and from then on the store reads the live
// matchMedia value and stays reactive on resize. Unlike the old plain-effect hook,
// useSyncExternalStore reliably re-renders every consumer when the value changes.
export function useIsMobile() {
  const [mounted, setMounted] = React.useState(false);
  React.useLayoutEffect(() => {
    setMounted(true);
  }, []);
  const matches = React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
  return mounted && matches;
}
