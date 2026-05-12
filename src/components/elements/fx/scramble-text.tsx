"use client";

import { useEffect, useRef, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

interface ScrambleTextProps {
  text: string;
  className?: string;
}

export function ScrambleText({ text, className }: ScrambleTextProps) {
  const [displayed, setDisplayed] = useState<string[]>(() => text.split(""));
  const [settled, setSettled] = useState(0);
  const settledRef = useRef(0);

  useEffect(() => {
    settledRef.current = 0;
    const totalLetters = text.length;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset animation state when text changes
    setSettled(0);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- size buffer to current word length, dropping stale tail chars
    setDisplayed(() =>
      Array.from({ length: totalLetters }, (_, i) =>
        text[i] === " "
          ? " "
          : (CHARS[Math.floor(Math.random() * CHARS.length)] ?? ""),
      ),
    );

    const scrambleInterval = setInterval(() => {
      const s = settledRef.current;
      if (s >= totalLetters) return;
      setDisplayed((prev) => {
        const next = prev.slice(0, totalLetters);
        while (next.length < totalLetters) next.push("");
        for (let i = s; i < totalLetters; i++) {
          if (text[i] === " ") {
            next[i] = " ";
          } else {
            next[i] = CHARS[Math.floor(Math.random() * CHARS.length)] ?? "";
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
        next[s] = text[s] ?? "";
        return next;
      });
    }, 80);

    return () => {
      clearInterval(scrambleInterval);
      clearInterval(settleInterval);
    };
  }, [text]);

  return (
    <span className={className} aria-label={text}>
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
