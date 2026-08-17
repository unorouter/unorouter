"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const clipTokenizerPromise = import("@huggingface/transformers").then((m) =>
  m.CLIPTokenizer.from_pretrained("Xenova/clip-vit-base-patch32"),
);

export function TokenEstimate(props: { text: string }) {
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
  if (!props.text.trim() || count === 0) return null;
  return (
    <p className="text-muted-foreground mt-1 text-xs">
      {t("IMAGE.TOKEN_COUNT", { count })}
    </p>
  );
}
