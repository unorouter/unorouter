// Service-worker streaming download. The SW answers two magic same-origin URLs with a streamed
// attachment Response, so large payloads download without materializing in memory (no OOM on
// memory-starved iOS). SW is prod-only, so this is unavailable in dev (callers fall back).
//   - DB file: the SW reads the OPFS file itself; the page only navigates. No pump.
//   - JSON: generated in JS, so the page posts chunks over a MessagePort (a ReadableStream is not
//     postMessage-transferable before Safari 27). No credit backpressure - diagnostics is small.

const DOWNLOAD_PREFIX = "/__download/";
const READY_TIMEOUT_MS = 5000;

// Thrown when the SW path can't run (no controller / handshake failure); caller falls back.
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

// DB download: the SW reads OPFS itself. The page must have released the SQLocal handle first.
export function downloadOpfsFileViaSw(
  dbFileName: string,
  filename: string,
): void {
  if (!navigator.serviceWorker?.controller)
    throw new SwUnsupportedError("no service worker controller");
  triggerIframe(
    `${DOWNLOAD_PREFIX}db?f=${encodeURIComponent(dbFileName)}&name=${encodeURIComponent(filename)}`,
  );
}

// JSON download: stream chunks generated in JS to the SW over a MessagePort, then navigate.
export async function downloadJsonViaSw(
  filename: string,
  source: AsyncIterable<Uint8Array>,
): Promise<void> {
  const controller = navigator.serviceWorker?.controller;
  if (!controller) throw new SwUnsupportedError("no service worker controller");

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
