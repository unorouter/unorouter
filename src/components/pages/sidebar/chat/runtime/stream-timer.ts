import { watchDbActivity } from "@/lib/db/client/db-activity";
import { logChatDebug } from "@/lib/utils/chat-debug-log";

const LAG_PROBE_MS = 250;

// Splits one reply's wait into phases, so a slow report shows whether the time
// went to our assembly, the upstream's first byte, its thinking, or a busy page.
function roundDb(d: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(d).map(([k, v]) => [k, Math.round(v)]),
  );
}

export function makeStreamTimer(model: string) {
  const t0 = performance.now();
  const marks: Record<string, number> = {};
  let rawBytes = 0;
  let maxLagMs = 0;
  let totalLagMs = 0;
  let lagTimer: ReturnType<typeof setInterval> | undefined;
  let done = false;
  // Longest silence mid-reply, on the wire and on screen: a stall in both is
  // the upstream, a stall only on screen is our pipeline holding text back.
  const gaps = {
    raw: { last: 0, max: 0, at: 0, over5s: 0 },
    ui: { last: 0, max: 0, at: 0, over5s: 0 },
  };
  // Background tabs get throttled, and users tab away while a reply thinks.
  let hiddenMs = 0;
  let hiddenSince = document.hidden ? performance.now() : 0;
  const onVisibility = () => {
    if (document.hidden) {
      if (!hiddenSince) hiddenSince = performance.now();
    } else if (hiddenSince) {
      hiddenMs += performance.now() - hiddenSince;
      hiddenSince = 0;
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  const freshDb = () => ({
    queries: 0,
    queryMs: 0,
    slowestMs: 0,
    waitMs: 0,
    maxWaitMs: 0,
    parks: 0,
  });
  // Split at fetchStart: history and assembly queries are expected, any during
  // the stream are not.
  let dbPrep: ReturnType<typeof freshDb> | null = null;
  let db = freshDb();
  const unwatchDb = watchDbActivity((event) => {
    if (event.kind === "park") {
      db.parks++;
      return;
    }
    db.queries++;
    db.queryMs += event.ms;
    db.slowestMs = Math.max(db.slowestMs, event.ms);
    db.waitMs += event.waitMs;
    db.maxWaitMs = Math.max(db.maxWaitMs, event.waitMs);
  });
  const tick = (kind: keyof typeof gaps) => {
    const g = gaps[kind];
    const now = at();
    if (g.last > 0) {
      const gap = now - g.last;
      if (gap > 5000) g.over5s++;
      if (gap > g.max) {
        g.max = gap;
        g.at = g.last;
      }
    }
    g.last = now;
  };
  const at = () => Math.round(performance.now() - t0);
  const mark = (name: string) => {
    if (!(name in marks)) marks[name] = at();
  };

  const startLagProbe = () => {
    let expected = performance.now() + LAG_PROBE_MS;
    lagTimer = setInterval(() => {
      const now = performance.now();
      const lag = now - expected;
      if (lag > 50) {
        totalLagMs += lag;
        maxLagMs = Math.max(maxLagMs, lag);
      }
      expected = now + LAG_PROBE_MS;
    }, LAG_PROBE_MS);
  };

  return {
    mark,
    tickUi: () => tick("ui"),
    wrapFetch(inner: typeof fetch): typeof fetch {
      return async (input, init) => {
        mark("fetchStart");
        dbPrep ??= db;
        db = freshDb();
        startLagProbe();
        const res = await inner(input, init);
        mark("headers");
        if (!res.body) return res;
        const counted = res.body.pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              if (rawBytes === 0) mark("firstByte");
              rawBytes += chunk.byteLength;
              tick("raw");
              marks.lastByte = at();
              controller.enqueue(chunk);
            },
          }),
        );
        return new Response(counted, {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
      };
    },
    end(outcome: string, extra: Record<string, unknown> = {}) {
      if (done) return;
      done = true;
      clearInterval(lagTimer);
      unwatchDb();
      document.removeEventListener("visibilitychange", onVisibility);
      if (hiddenSince) hiddenMs += performance.now() - hiddenSince;
      logChatDebug("stream.timing", {
        model,
        outcome,
        totalMs: at(),
        ...marks,
        rawBytes,
        rawMaxGapMs: gaps.raw.max,
        rawMaxGapAt: gaps.raw.at,
        rawGapsOver5s: gaps.raw.over5s,
        uiMaxGapMs: gaps.ui.max,
        uiMaxGapAt: gaps.ui.at,
        uiGapsOver5s: gaps.ui.over5s,
        hiddenMs: Math.round(hiddenMs),
        endedHidden: document.hidden,
        dbPrep: dbPrep && roundDb(dbPrep),
        dbStream: roundDb(db),
        maxLagMs: Math.round(maxLagMs),
        totalLagMs: Math.round(totalLagMs),
        ...extra,
      });
    },
  };
}
