// Watched by the stream timer, so a stalled reply can be matched against the
// database work and tab handovers that happened while it streamed.
export type DbActivity =
  { kind: "query"; ms: number; waitMs: number } | { kind: "park" };

const listeners = new Set<(event: DbActivity) => void>();

export function watchDbActivity(cb: (event: DbActivity) => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function reportDbActivity(event: DbActivity) {
  for (const cb of listeners) cb(event);
}
