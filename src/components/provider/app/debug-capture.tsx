"use client";

import { installDebugErrorCapture } from "@/lib/utils/debug-error-capture";
import { useEffect } from "react";

// Installs the global error/rejection breadcrumbs + requests OPFS persistence. Mounted once.
export function DebugCapture() {
  useEffect(() => {
    installDebugErrorCapture();
  }, []);
  return null;
}
