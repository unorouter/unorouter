"use client";

import { useEffect, useState } from "react";
import { ScrambleText } from "./scramble-text";

interface ScrambleRotateProps {
  words: string[];
  intervalMs?: number;
  className?: string;
}

export function ScrambleRotate(props: ScrambleRotateProps) {
  const intervalMs = props.intervalMs ?? 2400;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (props.words.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % props.words.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [props.words.length, intervalMs]);

  const current = props.words[index] ?? props.words[0] ?? "";
  return <ScrambleText text={current} className={props.className} />;
}
