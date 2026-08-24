import { SQLocalDrizzle } from "sqlocal/drizzle";
import type {
  SahPoolControlMessage,
  SahPoolControlReply,
  SahPoolDiagnosis,
} from "./sahpool/sahpool-worker";

// The app's sahpool worker (opfs-sahpool VFS, no cross-origin isolation)
// instead of sqlocal's default worker (opfs VFS, SharedArrayBuffer,
// COOP/COEP-gated). One worker per database, since the driver keeps a pool per
// database path and concurrent databases (live + import/export scratch) must
// not contend for one pool.
const workers = new WeakMap<SQLocalDrizzle, Worker>();

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
  return sql;
}

let controlSeq = 0;

// Addressed to the worker directly because sqlocal's processor protocol has no
// pause/resume; the worker intercepts these before delegating, and sqlocal's
// own handler ignores unknown message types.
function control(
  sql: SQLocalDrizzle,
  type: SahPoolControlMessage["type"],
): Promise<SahPoolDiagnosis | undefined> {
  const worker = workers.get(sql);
  if (!worker) return Promise.resolve(undefined);
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
      else resolve(event.data.diagnosis);
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ type, key } satisfies SahPoolControlMessage);
  });
}

export async function pauseSql(sql: SQLocalDrizzle): Promise<void> {
  await control(sql, "sahpool-pause");
}

// destroy() leaves the worker alive, and with it the pool's sync access
// handles, so a retry loop abandoning one client per attempt ends with a row of
// workers holding the same file and the next install failing
// NoModificationAllowedError, blaming "another tab".
export function terminateSql(sql: SQLocalDrizzle): void {
  const worker = workers.get(sql);
  if (!worker) return;
  worker.terminate();
  workers.delete(sql);
}

export async function resumeSql(sql: SQLocalDrizzle): Promise<void> {
  await control(sql, "sahpool-resume");
}

export function diagnoseSql(
  sql: SQLocalDrizzle,
): Promise<SahPoolDiagnosis | undefined> {
  return control(sql, "sahpool-diagnose");
}
