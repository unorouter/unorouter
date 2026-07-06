"use client";

import { installDebugErrorCapture } from "@/lib/utils/debug-error-capture";
import { useEffect } from "react";

export function DebugCapture() {
  useEffect(() => {
    installDebugErrorCapture();
  }, []);
  return null;
}
