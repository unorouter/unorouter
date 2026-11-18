"use client";

import {
  installDebugErrorCapture,
  installDomReconciliationGuard,
  installInteractionErrorToast,
  installResumeDiagnostics,
  requestPersistentStorage,
} from "@/lib/utils/client-runtime-guards";
import { handleError } from "@/lib/utils/client";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export function ClientRuntimeGuards() {
  const t = useTranslations();

  useEffect(
    () => installInteractionErrorToast((error) => handleError(error, t)),
    [t],
  );

  useEffect(() => {
    installDomReconciliationGuard();
    installDebugErrorCapture();
    installResumeDiagnostics();
    requestPersistentStorage();
  }, []);
  return null;
}
