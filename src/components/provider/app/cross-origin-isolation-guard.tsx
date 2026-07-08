"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "uno-coi-reload";

export function CrossOriginIsolationGuard(props: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (window.crossOriginIsolated) {
      sessionStorage.removeItem(RELOAD_FLAG);
      return;
    }
    if (!sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
      return;
    }
    console.warn(
      "[coi] document not cross-origin isolated after reload; SQLocal will use in-memory storage",
    );
  }, []);

  return <>{props.children}</>;
}
