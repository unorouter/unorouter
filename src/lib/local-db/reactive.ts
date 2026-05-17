"use client";

// ---------------------------------------------------------------------------
// Per-kind reactive subscriptions. SQLocal's `reactiveQuery` requires
// `reactive: true` on the constructor + the experimental SQLite extension
// `tables_used()`. We currently run with `reactive: false` (see client.ts)
// because the reactive runtime causes the SQLocal worker to hang against
// our bundler setup. Multi-tab live updates are tracked separately for v4.
// ---------------------------------------------------------------------------

type Unsubscribe = () => void;

type ReactiveKind =
  | "characters"
  | "personas"
  | "lorebooks"
  | "presets"
  | "cards"
  | "conversations"
  | "generationSessions"
  | "theme";

export async function subscribeReactive<T>(
  _kind: ReactiveKind,
  _userId: number,
  _onChange: (rows: T[]) => void,
): Promise<Unsubscribe> {
  return () => {};
}
