"use client";

import { logger } from "@/lib/utils/logger";
import { useState } from "react";
import { toast } from "sonner";

export function useCopyToClipboard() {
  const [text, setText] = useState<string | null>(null);

  const copy = async (
    value: string,
    options: {
      timeout?: number;
      withToast?: boolean | string;
      successMessage?: string;
    },
  ) => {
    const timeout = options.timeout ?? 3000;
    const withToast = options.withToast ?? false;
    const successMessage = options.successMessage ?? "Copied to clipboard";

    if (!navigator?.clipboard) {
      logger.warn("Clipboard not supported", { context: "ui.copy-clipboard" });
      return false;
    }

    try {
      await navigator.clipboard.writeText(value);
      setText(value);

      if (timeout) {
        setTimeout(() => {
          setText(null);
        }, timeout);
      }

      if (withToast) {
        if (typeof withToast === "string") {
          toast.success(withToast);
        } else {
          toast.success(successMessage);
        }
      }

      return true;
    } catch (error) {
      logger.warn("Copy failed", {
        context: "ui.copy-clipboard",
        error: String(error),
      });
      setText(null);
      return false;
    }
  };

  return { text, copy, isCopied: text !== null };
}
