import { errMessage, rec } from "@/lib/utils/base";
import { SQLocalProcessor } from "sqlocal";
import { SQLiteSahPoolDriver } from "./sqlite-sahpool-driver";
import { poolLog } from "./pool-log";

type Sqlite3Logger = (...args: unknown[]) => void;
declare global {
  var sqlite3ApiConfig:
    { warn?: Sqlite3Logger; error?: Sqlite3Logger } | undefined;
}

// Read once when sqlite3 boots. The pool reports each slot it keeps, removes
// or refuses only through these, never as an error the page sees.
const forward =
  (event: string, write: Sqlite3Logger): Sqlite3Logger =>
  (...args) => {
    write(...args);
    poolLog(event, {
      message: args
        .map((a) =>
          a instanceof Uint8Array ? `<${a.byteLength} bytes>` : String(a),
        )
        .join(" ")
        .slice(0, 500),
    });
  };
globalThis.sqlite3ApiConfig = {
  warn: forward("db.pool.warn", console.warn.bind(console)),
  error: forward("db.pool.error", console.error.bind(console)),
};

// Replaces sqlocal's own worker entry, which hardwires the isolation-requiring
// opfs driver; its client accepts this one via the `processor` config.
const driver = new SQLiteSahPoolDriver();
const processor = new SQLocalProcessor(driver);

export type SahPoolControlMessage =
  | {
      type: "sahpool-pause" | "sahpool-resume" | "sahpool-diagnose";
      key: string;
    }
  | {
      type: "sahpool-export-file" | "sahpool-unlink-file";
      key: string;
      name: string;
    };

export type SahPoolControlReply = {
  type: "sahpool-control-done";
  key: string;
  error?: string;
  diagnosis?: SahPoolDiagnosis;
  data?: ArrayBuffer;
};

export type SahPoolDiagnosis = {
  poolError?: string;
  filesAtOpen?: string[];
  opfsReachable: boolean;
  opfsError?: string;
  persisted?: boolean;
  quotaBytes?: number;
  usageBytes?: number;
};

function isControlMessage(data: unknown): data is SahPoolControlMessage {
  const type = rec(data)?.type;
  return (
    type === "sahpool-pause" ||
    type === "sahpool-resume" ||
    type === "sahpool-diagnose" ||
    type === "sahpool-export-file" ||
    type === "sahpool-unlink-file"
  );
}

async function diagnose(): Promise<SahPoolDiagnosis> {
  const result: SahPoolDiagnosis = {
    poolError: driver.lastPoolError,
    filesAtOpen: driver.filesAtOpen,
    opfsReachable: false,
  };
  try {
    await navigator.storage.getDirectory();
    result.opfsReachable = true;
  } catch (err) {
    result.opfsError = errMessage(err).slice(0, 200);
  }
  try {
    const estimate = await navigator.storage.estimate();
    result.quotaBytes = estimate.quota;
    result.usageBytes = estimate.usage;
    result.persisted = await navigator.storage.persisted();
  } catch {}
  return result;
}

async function handleControl(message: SahPoolControlMessage): Promise<void> {
  const reply: SahPoolControlReply = {
    type: "sahpool-control-done",
    key: message.key,
  };
  try {
    if (message.type === "sahpool-diagnose") reply.diagnosis = await diagnose();
    else if (message.type === "sahpool-pause") await driver.pause();
    else if (message.type === "sahpool-export-file")
      reply.data = await driver.exportPoolFile(message.name);
    else if (message.type === "sahpool-unlink-file")
      driver.unlinkPoolFile(message.name);
    else await driver.resume();
  } catch (err) {
    reply.error = String(err);
  }
  if (reply.data) self.postMessage(reply, [reply.data]);
  else self.postMessage(reply);
}

self.onmessage = (message) => {
  if (isControlMessage(message.data)) {
    void handleControl(message.data);
    return;
  }
  processor.postMessage(message);
};

processor.onmessage = (message, transfer) => {
  self.postMessage(message, transfer);
};
