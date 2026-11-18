"use client";

import { copyText } from "@/lib/utils/client";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function useCopyToClipboard() {
  const t = useTranslations();
  const [text, setText] = useState<string | null>(null);

  const copy = async (
    value: string,
    options: {
      timeout?: number;
      withToast?: boolean | string;
      successMessage?: string;
    } = {},
  ) => {
    const success =
      typeof options.withToast === "string"
        ? options.withToast
        : options.withToast
          ? (options.successMessage ?? t("COMMON.COPIED_CLIPBOARD"))
          : undefined;
    if (!(await copyText(t, value, success))) return false;
    setText(value);
    const timeout = options.timeout ?? 3000;
    if (timeout) setTimeout(() => setText(null), timeout);
    return true;
  };

  return { text, copy, isCopied: text !== null };
}
