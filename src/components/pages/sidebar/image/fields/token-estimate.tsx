"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

// Loaded on the first non-empty prompt, never at module load: this is a
// 1.1MB library plus a tokenizer download from huggingface.co, and at module
// load it ran on every cold /image boot in front of the page's own chunks.
// On an iPhone over LTE that was the difference between the page coming up
// and the user giving up.
let clipTokenizerPromise:
  Promise<{ encode: (text: string) => unknown[] }> | undefined;
const clipTokenizer = () =>
  (clipTokenizerPromise ??= import("@huggingface/transformers").then((m) =>
    m.CLIPTokenizer.from_pretrained("Xenova/clip-vit-base-patch32"),
  ));

export function TokenEstimate(props: { text: string }) {
  const t = useTranslations();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!props.text) return;
    let alive = true;
    clipTokenizer()
      .then((tok) => {
        if (alive) setCount(tok.encode(props.text).length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [props.text]);
  if (!props.text.trim() || count === 0) return null;
  return (
    <p className="text-muted-foreground mt-1 text-xs">
      {t("IMAGE.TOKEN_COUNT", { count })}
    </p>
  );
}
