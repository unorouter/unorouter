"use client";

import {
  localDbOpenErrorKind,
  subscribeLocalDbOpenFailure,
} from "@/lib/db/client/client";
import { useEffect, useState, useSyncExternalStore } from "react";

// Firefox refuses OPFS with a SecurityError whenever site data is blocked for
// the origin (private window, "block cookies", strict tracking protection), and
// Safari does the same in some lockdown configurations. The chat DB is the only
// copy of a user's chats, so a browser that cannot open it must say so rather
// than failing every action with a generic error.
export function useStorageBlocked(): "blocked" | "held" | null {
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
