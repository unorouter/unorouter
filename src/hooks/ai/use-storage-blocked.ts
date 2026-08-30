"use client";

import { useEffect, useState } from "react";

// Firefox refuses OPFS with a SecurityError whenever site data is blocked for
// the origin (private window, "block cookies", strict tracking protection), and
// Safari does the same in some lockdown configurations. The chat DB is the only
// copy of a user's chats, so a browser that cannot open it must say so rather
// than failing every action with a generic error.
export function useStorageBlocked(): boolean {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    let alive = true;
    navigator.storage?.getDirectory().catch(() => alive && setBlocked(true));
    return () => {
      alive = false;
    };
  }, []);
  return blocked;
}
