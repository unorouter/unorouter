"use client";

import {
  installDebugErrorCapture,
  installDomReconciliationGuard,
  requestPersistentStorage,
} from "@/lib/utils/client-runtime-guards";
import { useEffect } from "react";

export function ClientRuntimeGuards() {
  useEffect(() => {
    installDomReconciliationGuard();
    installDebugErrorCapture();
    requestPersistentStorage();
  }, []);
  return null;
}
