"use client";

import type { PendingTaskType } from "@/lib/db/schema/client";
import { logEnrichHandler } from "./log-enrich-task";
import { syncHandler } from "./sync-task";
import type { TaskHandler } from "./types";

// taskType -> handler. Lazy by design: the queue<->handler import cycle
// (queue -> registry -> sync-task -> queue) means a top-level handler map would
// read `syncHandler` before sync-task.ts finished evaluating (TDZ). Resolving
// inside the function defers the read to drain/enqueue time, after all modules
// have initialized. Adding a task variant = a new handler module + one case.
export function getHandler(taskType: PendingTaskType): TaskHandler {
  switch (taskType) {
    case "sync":
      return syncHandler;
    case "logEnrich":
      return logEnrichHandler;
  }
}
