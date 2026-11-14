"use client";

import {
  localDbOpenErrorKind,
  subscribeLocalDbOpenFailure,
} from "@/lib/db/client/client";
import { useEffect, useState, useSyncExternalStore } from "react";

// Firefox refuses OPFS with a SecurityError when site data is blocked (private
// window, "block cookies", strict tracking protection), as does Safari lockdown.
export function useStorageBlocked(): "blocked" | "held" | "emptied" | null {
  const [probeFailed, setProbeFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    navigator.storage
      ?.getDirectory()
      .catch(() => alive && setProbeFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  // getDirectory() succeeding does not mean the pool can install: a Helium user
  // reached OPFS but every open failed, so the retry loop just logged and the
  // page stayed silently unusable. A terminal open failure says the same thing
  // to the user, whatever refused it.
  const openError = useSyncExternalStore(
    subscribeLocalDbOpenFailure,
    localDbOpenErrorKind,
    () => null,
  );

  return openError ?? (probeFailed ? "blocked" : null);
}
