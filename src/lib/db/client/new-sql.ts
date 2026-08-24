import { SQLocalDrizzle } from "sqlocal/drizzle";
import type {
  SahPoolControlMessage,
  SahPoolControlReply,
  SahPoolDiagnosis,
} from "./sahpool/sahpool-worker";

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

// Addressed to the worker directly: sqlocal's processor protocol has no pause/resume.
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

// destroy() leaves the worker and its sync access handles alive, so a retry loop
// ends with stacked workers on one file and NoModificationAllowedError.
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
