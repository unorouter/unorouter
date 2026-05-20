"use client";

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
      console.warn("Clipboard not supported");
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
      console.warn("Copy failed", error);
      setText(null);
      return false;
    }
  };

  return { text, copy, isCopied: text !== null };
}
