"use client";

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
        return new Promise<void>((resolveHold) => {
          held.set(key, resolveHold);
          resolveAcquire(true);
        });
      })
      .catch(() => resolveAcquire(false));
  });
}

// Waits in the lock queue instead of failing on contention. Used for pool
// ownership handover: the current owner releases after draining, and the
// browser grants this waiting request. The timeout covers a frozen owner tab
// (a dead one releases automatically).
export function acquireLockWaiting(
  key: string,
  timeoutMs: number,
): Promise<boolean> {
  if (!supported()) return Promise.resolve(true);
  if (held.has(key)) return Promise.resolve(true);
  return new Promise((resolveAcquire) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    navigator.locks
      .request(key, { signal: controller.signal }, (lock) => {
        clearTimeout(timer);
        if (!lock) {
          resolveAcquire(false);
          return;
        }
        return new Promise<void>((resolveHold) => {
          held.set(key, resolveHold);
          resolveAcquire(true);
        });
      })
      .catch(() => {
        clearTimeout(timer);
        resolveAcquire(false);
      });
  });
}

export function releaseLock(key: string): void {
  held.get(key)?.();
  held.delete(key);
}
