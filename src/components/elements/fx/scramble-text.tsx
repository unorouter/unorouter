"use client";

import { useEffect, useRef, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

interface ScrambleTextProps {
  text: string;
  className?: string;
}

export function ScrambleText({ text, className }: ScrambleTextProps) {
  const [displayed, setDisplayed] = useState(() => text.split(""));
  const [settled, setSettled] = useState(0);
  const settledRef = useRef(0);

  useEffect(() => {
    // Reset on mount (handles strict mode double-invoke)
    settledRef.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset animation state on mount
    setSettled(0);

    const totalLetters = text.length;

    const scrambleInterval = setInterval(() => {
      const s = settledRef.current;
      if (s >= totalLetters) return;
      setDisplayed((prev) => {
        const next = [...prev];
        for (let i = s; i < totalLetters; i++) {
          if (text[i] === " ") {
            next[i] = " ";
          } else {
            next[i] = CHARS[Math.floor(Math.random() * CHARS.length)];
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
        const next = [...prev];
        next[s] = text[s];
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
