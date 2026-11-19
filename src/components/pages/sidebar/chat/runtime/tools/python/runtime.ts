"use client";

import { rec } from "@/lib/utils/base";
import { frameSrcdoc } from "./frame-source";

export type PythonFile = { name: string; bytes: Uint8Array };
export type PythonRun =
  | {
      ok: true;
      stdout: string;
      stderr: string;
      result: string | null;
      files: PythonFile[];
    }
  | { ok: false; stdout: string; stderr: string; error: string };

// Loading the runtime and packages is not counted against the run timeout; the
// whole call still has a ceiling.
const LOAD_CEILING_MS = 180_000;

let frame: HTMLIFrameElement | null = null;
let frameConv: string | null = null;
let frameReady: Promise<void> | null = null;
let seq = 0;
let queue: Promise<unknown> = Promise.resolve();

function teardown() {
  frame?.remove();
  frame = null;
  frameReady = null;
  frameConv = null;
}

function ensureFrame(convId: string | null): Promise<void> {
  // Variables and files persist within one chat; another chat starts clean.
  if (frame && frameConv !== convId) teardown();
  if (frameReady) return frameReady;
  const el = document.createElement("iframe");
  // Never allow-same-origin: the code must not reach this origin's cookies or
  // the local chat database.
  el.setAttribute("sandbox", "allow-scripts");
  el.style.display = "none";
  el.srcdoc = frameSrcdoc();
  frame = el;
  frameConv = convId;
  frameReady = new Promise<void>((resolve, reject) => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== el.contentWindow) return;
      if (rec(e.data)?.type !== "frame-ready") return;
      window.removeEventListener("message", onMsg);
      resolve();
    };
    window.addEventListener("message", onMsg);
    setTimeout(() => reject(new Error("Python sandbox did not start")), 15_000);
  });
  document.body.appendChild(el);
  return frameReady;
}

function filesOf(v: unknown): PythonFile[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((f) => {
    const r = rec(f);
    return r && typeof r.name === "string" && r.bytes instanceof Uint8Array
      ? [{ name: r.name, bytes: r.bytes }]
      : [];
  });
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

async function runOnce(
  convId: string | null,
  code: string,
  packages: string[],
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<PythonRun> {
  await ensureFrame(convId);
  const target = frame;
  if (!target?.contentWindow)
    throw new Error("Python sandbox is not available");
  const id = ++seq;
  return new Promise<PythonRun>((resolve, reject) => {
    let runTimer: ReturnType<typeof setTimeout> | undefined;
    const fail = (message: string) => {
      cleanup();
      teardown();
      reject(new Error(message));
    };
    const ceiling = setTimeout(
      () => fail("Python runtime took too long to load"),
      LOAD_CEILING_MS + timeoutMs,
    );
    const onAbort = () => fail("Aborted");
    const onMsg = (e: MessageEvent) => {
      if (e.source !== target.contentWindow) return;
      const m = rec(e.data);
      if (!m) return;
      if (m.type === "fatal")
        return fail(str(m.error) || "Python failed to start");
      if (m.id !== id) return;
      if (m.type === "ready") {
        runTimer = setTimeout(
          () =>
            fail(
              `TimeoutError: the code ran longer than ${Math.round(timeoutMs / 1000)}s; the interpreter was reset and its variables are gone`,
            ),
          timeoutMs,
        );
        return;
      }
      if (m.type !== "done") return;
      cleanup();
      resolve(
        m.ok === true
          ? {
              ok: true,
              stdout: str(m.stdout),
              stderr: str(m.stderr),
              result: typeof m.result === "string" ? m.result : null,
              files: filesOf(m.files),
            }
          : {
              ok: false,
              stdout: str(m.stdout),
              stderr: str(m.stderr),
              error: str(m.error),
            },
      );
    };
    const cleanup = () => {
      clearTimeout(ceiling);
      clearTimeout(runTimer);
      window.removeEventListener("message", onMsg);
      signal?.removeEventListener("abort", onAbort);
    };
    window.addEventListener("message", onMsg);
    signal?.addEventListener("abort", onAbort, { once: true });
    target.contentWindow?.postMessage({ id, code, packages }, "*");
  });
}

// One run at a time per tab: the interpreter is single-threaded and shared.
export function runPython(
  convId: string | null,
  code: string,
  packages: string[],
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<PythonRun> {
  const next = queue.then(() =>
    runOnce(convId, code, packages, timeoutMs, signal),
  );
  queue = next.catch(() => undefined);
  return next;
}
