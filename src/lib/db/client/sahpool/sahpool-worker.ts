import { errMessage, rec } from "@/lib/utils/base";
import { SQLocalProcessor } from "sqlocal";
import { SQLiteSahPoolDriver } from "./sqlite-sahpool-driver";

// Replaces sqlocal's own worker entry, which hardwires the isolation-requiring
// opfs driver; its client accepts this one via the `processor` config.
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

export type SahPoolDiagnosis = {
  poolError?: string;
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
    type === "sahpool-diagnose"
  );
}

async function diagnose(): Promise<SahPoolDiagnosis> {
  const result: SahPoolDiagnosis = {
    poolError: driver.lastPoolError,
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
