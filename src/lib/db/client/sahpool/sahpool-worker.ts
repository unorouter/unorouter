import { SQLocalProcessor } from "sqlocal";
import { SQLiteSahPoolDriver } from "./sqlite-sahpool-driver";

// Dedicated worker hosting the sahpool driver: OPFS sync access handles are
// only available in worker scope. Mirrors sqlocal's own worker entry, which
// hardwires the isolation-requiring opfs driver; sqlocal's client accepts
// this worker via its `processor` config.
const driver = new SQLiteSahPoolDriver();
const processor = new SQLocalProcessor(driver);

self.onmessage = (message) => {
  processor.postMessage(message);
};

processor.onmessage = (message, transfer) => {
  self.postMessage(message, transfer);
};
