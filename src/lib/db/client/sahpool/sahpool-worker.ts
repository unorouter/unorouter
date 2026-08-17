import { SQLocalProcessor } from "sqlocal";
import { SQLiteSahPoolDriver } from "./sqlite-sahpool-driver";

// Dedicated worker hosting the sahpool driver: OPFS sync access handles are
// only available in worker scope. Mirrors sqlocal's own worker entry, which
// hardwires the isolation-requiring opfs driver; sqlocal's client accepts
// this worker via its `processor` config.
const driver = new SQLiteSahPoolDriver();
const processor = new SQLocalProcessor(driver);

export type SahPoolControlMessage = {
  type: "sahpool-pause" | "sahpool-resume" | "sahpool-diagnose";
  key: string;
};

export type SahPoolControlReply = {
  type: "sahpool-control-done";
  key: string;
  error?: string;
  diagnosis?: SahPoolDiagnosis;
};

// Why the pool did not install. Everything here is read INSIDE the worker,
// because OPFS sync access handles exist in worker scope only, so the page
// cannot probe any of it directly.
export type SahPoolDiagnosis = {
  poolError?: string;
  opfsReachable: boolean;
  opfsError?: string;
  persisted?: boolean;
  quotaBytes?: number;
  usageBytes?: number;
};

function isControlMessage(data: unknown): data is SahPoolControlMessage {
  const type = (data as SahPoolControlMessage | null)?.type;
  return (
    type === "sahpool-pause" ||
    type === "sahpool-resume" ||
    type === "sahpool-diagnose"
  );
}

async function diagnose(): Promise<SahPoolDiagnosis> {
  const result: SahPoolDiagnosis = {
    poolError: driver.lastPoolError,
    opfsReachable: false,
  };
  try {
    // Reaching the root at all separates "OPFS is blocked" from "OPFS works
    // but this pool cannot be claimed", which need opposite advice.
    await navigator.storage.getDirectory();
    result.opfsReachable = true;
  } catch (err) {
    result.opfsError = String((err as Error)?.message ?? err).slice(0, 200);
  }
  try {
    const estimate = await navigator.storage.estimate();
    result.quotaBytes = estimate.quota;
    result.usageBytes = estimate.usage;
    result.persisted = await navigator.storage.persisted();
  } catch {
    // Estimate is advisory; its absence must not break the report.
  }
  return result;
}

// Pool handover control channel, handled here because SQLocalProcessor's
// message switch is a fixed set with no pause/resume. The client drains all
// in-flight statements before posting a pause, so this never races an exec.
async function handleControl(message: SahPoolControlMessage): Promise<void> {
  const reply: SahPoolControlReply = {
    type: "sahpool-control-done",
    key: message.key,
  };
  try {
    if (message.type === "sahpool-diagnose") reply.diagnosis = await diagnose();
    else if (message.type === "sahpool-pause") await driver.pause();
    else await driver.resume();
  } catch (err) {
    reply.error = String(err);
  }
  self.postMessage(reply);
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
