// Service-worker streaming download. The page pumps raw chunks (transferable ArrayBuffers; a
// ReadableStream is not transferable before Safari 27) over a MessagePort to the SW, which
// builds the actual download stream and answers a magic /__download/<token> URL. Peak memory is
// a few chunks, not the whole payload, so large OPFS DBs / diagnostics JSON download without
// OOMing memory-starved iOS. SW is prod-only, so this is unavailable in dev (fall back).

const DOWNLOAD_PREFIX = "/__download/";
const READY_TIMEOUT_MS = 5000;
const STALL_TIMEOUT_MS = 30000;

// Thrown when the SW path can't run (no controller, no support, handshake failure); caller falls back.
export class SwUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SwUnsupportedError";
  }
}

export type SwDownloadOpts = {
  filename: string;
  contentType: string;
  contentLength?: number;
  source: AsyncIterable<Uint8Array>;
};

export function swDownloadSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.serviceWorker &&
    !!navigator.serviceWorker.controller
  );
}

// Navigate a hidden iframe to the magic URL so the browser performs a real attachment download
// (iOS routes it to the share sheet / Save to Files). The stream lives in the SW, so removing the
// iframe later does not interrupt it; the delay just lets the download/share-sheet start.
function triggerIframe(url: string): void {
  const iframe = document.createElement("iframe");
  iframe.hidden = true;
  iframe.src = url;
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 60000);
}

export async function streamDownloadViaSw(opts: SwDownloadOpts): Promise<void> {
  const controller = navigator.serviceWorker?.controller;
  if (!controller) throw new SwUnsupportedError("no service worker controller");

  const token = crypto.randomUUID();
  const channel = new MessageChannel();
  const port = channel.port1;

  // credits = how many chunks the SW will accept before it must drain (pull) more. The SW grants
  // an initial budget in its ready ACK, then one credit per pull as the download consumes the body.
  let credits = 0;
  let waiter: (() => void) | null = null;
  let cancelled = false;
  let failure: Error | null = null;
  const ready = createDeferred();
  let lastProgress = Date.now();

  port.onmessage = (e) => {
    const msg = e.data;
    if (!msg) return;
    if (msg.type === "ready") {
      credits = msg.credits ?? 1;
      ready.resolve();
    } else if (msg.type === "pull") {
      credits++;
      lastProgress = Date.now();
      const w = waiter;
      waiter = null;
      if (w) w();
    } else if (msg.type === "cancelled") {
      cancelled = true;
      const w = waiter;
      waiter = null;
      if (w) w();
    }
  };

  // Hand the SW the port + metadata; it creates the stream then ACKs ready. now stamps TTL.
  controller.postMessage(
    {
      type: "download-start",
      token,
      filename: opts.filename,
      contentType: opts.contentType,
      contentLength: opts.contentLength,
      now: Date.now(),
    },
    [channel.port2],
  );

  await withTimeout(
    ready.promise,
    READY_TIMEOUT_MS,
    () => new SwUnsupportedError("service worker did not ack download"),
  );

  // The stream now exists in the SW; navigate so the fetch handler can consume it.
  triggerIframe(
    `${DOWNLOAD_PREFIX}${token}?name=${encodeURIComponent(opts.filename)}`,
  );

  try {
    for await (const chunk of opts.source) {
      if (cancelled) break;
      if (failure) throw failure;
      // Block until the SW has a credit (download has drained enough). Watchdog aborts a stall.
      while (credits <= 0 && !cancelled) {
        await waitForPull();
      }
      if (cancelled) break;
      credits--;
      lastProgress = Date.now();
      // Transfer the chunk's buffer so it is moved, not copied (zero-copy, low memory).
      const buffer = chunk.buffer.slice(
        chunk.byteOffset,
        chunk.byteOffset + chunk.byteLength,
      );
      port.postMessage({ type: "chunk", buffer }, [buffer]);
    }
    if (!cancelled) port.postMessage({ type: "end" });
  } catch (err) {
    port.postMessage({ type: "abort", error: String(err) });
    throw err;
  } finally {
    port.close();
  }

  function waitForPull(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setInterval(() => {
        if (Date.now() - lastProgress > STALL_TIMEOUT_MS) {
          clearInterval(timer);
          failure = new Error("download stalled");
          waiter = null;
          reject(failure);
        }
      }, 1000);
      waiter = () => {
        clearInterval(timer);
        resolve();
      };
    });
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
