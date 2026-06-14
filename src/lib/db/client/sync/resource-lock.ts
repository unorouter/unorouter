"use client";

    // Cross-tab single-holder locks on the Web Locks API: acquisition is atomic (the old BroadcastChannel version could double-grant under TOCTOU) and the browser auto-releases when the holding tab dies, so no TTL/heartbeat. acquire/release map onto a held request resolved on release.

const held = new Map<string, () => void>();

const supported = () =>
  typeof navigator !== "undefined" && "locks" in navigator;

export function acquireLock(key: string): Promise<boolean> {
  if (!supported()) return Promise.resolve(true);
  if (held.has(key)) return Promise.resolve(true);
  return new Promise((resolveAcquire) => {
    navigator.locks
      .request(key, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolveAcquire(false);
          return;
        }
        // Hold until releaseLock resolves this promise.
        return new Promise<void>((resolveHold) => {
          held.set(key, resolveHold);
          resolveAcquire(true);
        });
      })
      .catch(() => resolveAcquire(false));
  });
}

export function releaseLock(key: string): void {
  held.get(key)?.();
  held.delete(key);
}
