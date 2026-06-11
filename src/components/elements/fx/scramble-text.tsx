"use client";

import { pick } from "@/lib/utils/base";

import { useEffect, useRef, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

interface ScrambleTextProps {
  text: string;
  className?: string;
}

export function ScrambleText(props: ScrambleTextProps) {
  const [displayed, setDisplayed] = useState<string[]>(() =>
    props.text.split(""),
  );
  const [settled, setSettled] = useState(0);
  const settledRef = useRef(0);

  useEffect(() => {
    settledRef.current = 0;
    const totalLetters = props.text.length;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset animation state when text changes
    setSettled(0);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- size buffer to current word length, dropping stale tail chars
    setDisplayed(() =>
      Array.from({ length: totalLetters }, (_, i) =>
        props.text[i] === " " ? " " : (pick(CHARS) ?? ""),
      ),
    );

    const scrambleInterval = setInterval(() => {
      const s = settledRef.current;
      if (s >= totalLetters) return;
      setDisplayed((prev) => {
        const next = prev.slice(0, totalLetters);
        while (next.length < totalLetters) next.push("");
        for (let i = s; i < totalLetters; i++) {
          if (props.text[i] === " ") {
            next[i] = " ";
          } else {
            next[i] = pick(CHARS) ?? "";
          }
        }
        return next;
      });
    }, 40);

    const settleInterval = setInterval(() => {
      const s = settledRef.current;
      if (s >= totalLetters) {
        clearInterval(settleInterval);
        clearInterval(scrambleInterval);
        return;
      }
      settledRef.current = s + 1;
      setSettled(s + 1);
      setDisplayed((prev) => {
        const next = prev.slice(0, totalLetters);
        while (next.length < totalLetters) next.push("");
        next[s] = props.text[s] ?? "";
        return next;
      });
    }, 80);

    return () => {
      clearInterval(scrambleInterval);
      clearInterval(settleInterval);
    };
  }, [props.text]);

  return (
    <span className={props.className} aria-label={props.text}>
      {displayed.map((char, i) => (
        <span
          key={i}
          className={
            i < settled
              ? "inline-block transition-opacity duration-150"
              : "inline-block opacity-60"
          }
        >
          {char || "\u00A0"}
        </span>
      ))}
    </span>
  );
}
