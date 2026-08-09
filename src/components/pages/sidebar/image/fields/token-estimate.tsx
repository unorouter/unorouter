"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CLIP_TOKEN_CAP } from "../image-constants";

const clipTokenizerPromise = import("@huggingface/transformers").then((m) =>
  m.CLIPTokenizer.from_pretrained("Xenova/clip-vit-base-patch32"),
);

export function TokenEstimate(props: { text: string; family: string }) {
  const t = useTranslations();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!props.text) return;
    let alive = true;
    clipTokenizerPromise
      .then((tok) => {
        if (alive) setCount(tok.encode(props.text).length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [props.text]);
  const trimmed = props.text.trim();
  if (!trimmed || count === 0) return null;
  const showCap = props.family === "sdxl";
  const over = showCap && count > CLIP_TOKEN_CAP;
  return (
    <p
      className={
        over
          ? "mt-1 text-xs text-amber-700 dark:text-amber-400"
          : "text-muted-foreground mt-1 text-xs"
      }
    >
      {showCap
        ? t("IMAGE.TOKEN_COUNT_CAPPED", { count, cap: CLIP_TOKEN_CAP })
        : t("IMAGE.TOKEN_COUNT", { count })}
    </p>
  );
}
