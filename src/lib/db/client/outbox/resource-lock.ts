"use client";

const held = new Map<string, () => void>();

const supported = () =>
  typeof navigator !== "undefined" && "locks" in navigator;

function request(
  key: string,
  options: LockOptions,
  settle?: () => void,
): Promise<boolean> {
  return new Promise((resolveAcquire) => {
    navigator.locks
      .request(key, options, (lock) => {
        settle?.();
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
        settle?.();
        resolveAcquire(false);
      });
  });
}

export function acquireLock(key: string): Promise<boolean> {
  if (!supported() || held.has(key)) return Promise.resolve(true);
  return request(key, { ifAvailable: true });
}

// Waits in the lock queue instead of failing on contention. Used for pool
// ownership handover: the current owner releases after draining, and the
// browser grants this waiting request. The timeout covers a frozen owner tab
// (a dead one releases automatically).
export function acquireLockWaiting(
  key: string,
  timeoutMs: number,
): Promise<boolean> {
  if (!supported() || held.has(key)) return Promise.resolve(true);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return request(key, { signal: controller.signal }, () => clearTimeout(timer));
}

// Preempts whoever holds the key. Only safe as a last resort, after a handover
// has already gone unanswered: the previous holder is NOT told it lost the lock
// and keeps running. What makes it safe here is that the SAH pool itself
// refuses to initialise twice, so a genuinely live holder still blocks the
// second open with a clean error rather than two writers sharing the file.
export function stealLock(key: string): Promise<boolean> {
  if (!supported()) return Promise.resolve(true);
  return request(key, { steal: true });
}

export function releaseLock(key: string): void {
  held.get(key)?.();
  held.delete(key);
}

export function releaseAllLocks(): void {
  for (const key of [...held.keys()]) releaseLock(key);
}
