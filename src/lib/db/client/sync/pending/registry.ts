"use client";

import type { PendingTaskType } from "@/lib/db/schema/client";
import { logEnrichHandler } from "./log-enrich-task";
import type { TaskHandler } from "./types";

// taskType -> handler. The generic queue dispatches every drain/enqueue through
// here; logEnrich is the only live variant (Turso mirror-sync was torn out and
// will return as a new handler + one case here when re-added with a better
// architecture). Lazy lookup defers the handler read past module eval.
export function getHandler(taskType: PendingTaskType): TaskHandler {
  switch (taskType) {
    case "logEnrich":
      return logEnrichHandler;
  }
}
