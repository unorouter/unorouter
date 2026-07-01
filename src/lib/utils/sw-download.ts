// Service-worker streaming download. The SW answers two magic same-origin URLs with a streamed
// attachment Response, so large payloads download without materializing in memory (no OOM on
// memory-starved iOS). SW is prod-only, so this is unavailable in dev (callers fall back).
//   - DB file: the SW reads the OPFS file itself; the page only navigates. No pump.
//   - JSON: generated in JS, so the page posts chunks over a MessagePort (a ReadableStream is not
//     postMessage-transferable before Safari 27). No credit backpressure - diagnostics is small.
//
// CRITICAL: an uncontrolled page (SW not yet claimed, or an old build with no handler) would let
// /__download/ hit the server, which 404s to an HTML page - and the browser would "download" that
// HTML. So every entry point first awaits controller readiness and PROBES that the SW actually
// intercepts, throwing (-> caller falls back) instead of downloading a 404.

const DOWNLOAD_PREFIX = "/__download/";
const READY_TIMEOUT_MS = 5000;
const PROBE_HEADER = "x-sw-download";

// Thrown when the SW path can't run (no controller / not intercepting / handshake fail); caller falls back.
export class SwUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SwUnsupportedError";
  }
}

export function swDownloadSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.serviceWorker &&
    !!navigator.serviceWorker.controller
  );
}

// Confirm a live SW controls this page AND actually intercepts /__download/. Returns only when the
// probe response carries our marker header; throws otherwise so the caller falls back to the blob.
async function ensureSwIntercepts(): Promise<void> {
  if (!navigator.serviceWorker?.controller)
    throw new SwUnsupportedError("no service worker controller");
  // Wait for an active, controlling worker (fresh page loads claim asynchronously).
  await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new SwUnsupportedError("service worker not ready")),
        READY_TIMEOUT_MS,
      ),
    ),
  ]);
  let res: Response;
  try {
    res = await fetch(`${DOWNLOAD_PREFIX}probe`, {
      headers: { [PROBE_HEADER]: "1" },
    });
  } catch (e) {
    throw new SwUnsupportedError(`download probe failed: ${String(e)}`);
  }
  // The SW answers the probe with the marker header. A server 404 (old build / uncontrolled
  // iframe) is HTML with no marker -> we must NOT proceed, else the download is a 404 page.
  if (res.headers.get(PROBE_HEADER) !== "ok")
    throw new SwUnsupportedError("service worker did not intercept download");
}

// Navigate a hidden iframe to the magic URL so the browser performs a real attachment download
// (iOS routes it to the share sheet / Save to Files). The stream lives in the SW, so removing the
// iframe later does not interrupt it.
function triggerIframe(url: string): void {
  const iframe = document.createElement("iframe");
  iframe.hidden = true;
  iframe.src = url;
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 60000);
}

// Probe-only: confirm the SW will intercept + can read the file, WITHOUT tearing down anything.
// Returns "ok" | "locked" | throws SwUnsupportedError. Lets the caller release SQLocal only when
// the file is genuinely locked, and never on an old/uncontrolled build (which would lose the DB).
export async function probeOpfsReadable(
  dbFileName: string,
): Promise<"ok" | "locked"> {
  await ensureSwIntercepts();
  const res = await fetch(
    `${DOWNLOAD_PREFIX}db?f=${encodeURIComponent(dbFileName)}&probe=1`,
    { headers: { [PROBE_HEADER]: "1" } },
  );
  if (res.headers.get(PROBE_HEADER) !== "ok")
    throw new SwUnsupportedError("service worker did not intercept db probe");
  const state = res.headers.get("x-sw-db-state");
  if (state === "readable") return "ok";
  if (state === "locked") return "locked";
  throw new SwUnsupportedError(`db not readable: ${state ?? "unknown"}`);
}

// DB download: the SW reads OPFS itself. Caller has already probed + released the handle if needed.
export function downloadOpfsFileViaSw(
  dbFileName: string,
  filename: string,
): void {
  triggerIframe(
    `${DOWNLOAD_PREFIX}db?f=${encodeURIComponent(dbFileName)}&name=${encodeURIComponent(filename)}`,
  );
}

// JSON download: stream chunks generated in JS to the SW over a MessagePort, then navigate.
export async function downloadJsonViaSw(
  filename: string,
  source: AsyncIterable<Uint8Array>,
): Promise<void> {
  await ensureSwIntercepts();
  const controller = navigator.serviceWorker.controller!;

  const token = crypto.randomUUID();
  const channel = new MessageChannel();
  const port = channel.port1;
  const ready = createDeferred();

  port.onmessage = (e) => {
    if (e.data?.type === "ready") ready.resolve();
  };
  controller.postMessage(
    { type: "json-download-start", token, filename, now: Date.now() },
    [channel.port2],
  );
  await withTimeout(
    ready.promise,
    READY_TIMEOUT_MS,
    () => new SwUnsupportedError("service worker did not ack download"),
  );

  triggerIframe(
    `${DOWNLOAD_PREFIX}json/${token}?name=${encodeURIComponent(filename)}`,
  );

  try {
    for await (const chunk of source) {
      // Transfer the chunk's buffer so it moves, not copies (zero-copy, low memory).
      const buffer = chunk.buffer.slice(
        chunk.byteOffset,
        chunk.byteOffset + chunk.byteLength,
      );
      port.postMessage({ type: "chunk", buffer }, [buffer]);
    }
    port.postMessage({ type: "end" });
  } catch (err) {
    port.postMessage({ type: "abort", error: String(err) });
    throw err;
  } finally {
    port.close();
  }
}

type Deferred = { promise: Promise<void>; resolve: () => void };
function createDeferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => Error,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(onTimeout()), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
