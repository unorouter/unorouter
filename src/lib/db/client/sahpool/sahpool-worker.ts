import { SQLocalProcessor } from "sqlocal";
import { SQLiteSahPoolDriver } from "./sqlite-sahpool-driver";

// Dedicated worker hosting the sahpool driver: OPFS sync access handles are
// only available in worker scope. Mirrors sqlocal's own worker entry, which
// hardwires the isolation-requiring opfs driver; sqlocal's client accepts
// this worker via its `processor` config.
const driver = new SQLiteSahPoolDriver();
const processor = new SQLocalProcessor(driver);

export type SahPoolControlMessage = {
  type: "sahpool-pause" | "sahpool-resume";
  key: string;
};

export type SahPoolControlReply = {
  type: "sahpool-control-done";
  key: string;
  error?: string;
};

function isControlMessage(data: unknown): data is SahPoolControlMessage {
  const type = (data as SahPoolControlMessage | null)?.type;
  return type === "sahpool-pause" || type === "sahpool-resume";
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
    if (message.type === "sahpool-pause") await driver.pause();
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
