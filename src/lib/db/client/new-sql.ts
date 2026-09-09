import { SQLocalDrizzle } from "sqlocal/drizzle";
import type {
  SahPoolControlMessage,
  SahPoolControlReply,
  SahPoolDiagnosis,
} from "./sahpool/sahpool-worker";

const workers = new WeakMap<SQLocalDrizzle, Worker>();
// A failed open leaves a worker nothing holds a handle to, and it keeps the
// pool's sync access handles open, which is what makes a later wipe fail.
const liveWorkers = new Set<Worker>();

export function newSql(dbPath: string): SQLocalDrizzle {
  const worker = new Worker(
    new URL("./sahpool/sahpool-worker", import.meta.url),
    {
      type: "module",
    },
  );
  const sql = new SQLocalDrizzle({
    databasePath: dbPath,
    reactive: false,
    processor: worker,
  });
  workers.set(sql, worker);
  liveWorkers.add(worker);
  return sql;
}

let controlSeq = 0;

// Closes the pool's sync access handles without killing the worker: the
// page may still be alive (iOS app switch), and a killed worker is the one
// thing the device tests have not yet ruled out.
export function pauseAllSql(): void {
  for (const worker of liveWorkers) {
    worker.postMessage({
      type: "sahpool-pause",
      key: `sahpool-control-${++controlSeq}`,
    });
  }
}

export function terminateAllSql(): void {
  for (const worker of liveWorkers) worker.terminate();
  liveWorkers.clear();
}

// Unload path. A killed worker leaves its sync access handles for WebKit to
// drop on its own schedule, and a same-tab reload opens the pool before that
// happens; asking the worker to pause first closes them in a few ms. The
// reply is the signal, the timer covers a page frozen before it arrives.
export function unloadAllSql(graceMs: number): void {
  const workers = [...liveWorkers];
  liveWorkers.clear();
  for (const worker of workers) {
    const key = `sahpool-control-${++controlSeq}`;
    let done = false;
    const kill = () => {
      if (done) return;
      done = true;
      worker.terminate();
    };
    const timer = setTimeout(kill, graceMs);
    worker.addEventListener(
      "message",
      (event: MessageEvent<SahPoolControlReply>) => {
        if (
          event.data?.type !== "sahpool-control-done" ||
          event.data.key !== key
        )
          return;
        clearTimeout(timer);
        kill();
      },
    );
    worker.postMessage({ type: "sahpool-pause", key });
  }
}

// Addressed to the worker directly: sqlocal's processor protocol has no pause/resume.
// Omit over a union collapses the discriminant; distribute it instead.
type ControlRequest = SahPoolControlMessage extends infer M
  ? M extends { key: string }
    ? Omit<M, "key">
    : never
  : never;

function control(
  sql: SQLocalDrizzle,
  message: ControlRequest,
): Promise<SahPoolControlReply | undefined> {
  const worker = workers.get(sql);
  // A terminated worker never replies; the promise would hang forever.
  if (!worker || !liveWorkers.has(worker)) return Promise.resolve(undefined);
  const key = `sahpool-control-${++controlSeq}`;
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<SahPoolControlReply>) => {
      if (
        event.data?.type !== "sahpool-control-done" ||
        event.data.key !== key
      ) {
        return;
      }
      worker.removeEventListener("message", onMessage);
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data);
    };
    worker.addEventListener("message", onMessage);
    const full: SahPoolControlMessage = { ...message, key };
    worker.postMessage(full);
  });
}

export async function exportPoolFileSql(
  sql: SQLocalDrizzle,
  name: string,
): Promise<ArrayBuffer> {
  const reply = await control(sql, { type: "sahpool-export-file", name });
  if (!reply?.data) throw new Error(`export of ${name} returned no data`);
  return reply.data;
}

export async function unlinkPoolFileSql(
  sql: SQLocalDrizzle,
  name: string,
): Promise<void> {
  await control(sql, { type: "sahpool-unlink-file", name });
}

export async function pauseSql(sql: SQLocalDrizzle): Promise<void> {
  await control(sql, { type: "sahpool-pause" });
}

// destroy() leaves the worker and its sync access handles alive, so a retry loop
// ends with stacked workers on one file and NoModificationAllowedError.
export function terminateSql(sql: SQLocalDrizzle): void {
  const worker = workers.get(sql);
  if (!worker) return;
  worker.terminate();
  workers.delete(sql);
  liveWorkers.delete(worker);
}

export async function resumeSql(sql: SQLocalDrizzle): Promise<void> {
  await control(sql, { type: "sahpool-resume" });
}

export function diagnoseSql(
  sql: SQLocalDrizzle,
): Promise<SahPoolDiagnosis | undefined> {
  return control(sql, { type: "sahpool-diagnose" }).then((r) => r?.diagnosis);
}
