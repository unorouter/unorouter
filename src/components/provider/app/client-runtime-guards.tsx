"use client";

import {
  installDebugErrorCapture,
  installDomReconciliationGuard,
  installResumeDiagnostics,
  requestPersistentStorage,
} from "@/lib/utils/client-runtime-guards";
import { useEffect } from "react";

export function ClientRuntimeGuards() {
  useEffect(() => {
    installDomReconciliationGuard();
    installDebugErrorCapture();
    installResumeDiagnostics();
    requestPersistentStorage();
  }, []);
  return null;
}
