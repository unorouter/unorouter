"use client";

import { useEffect, useRef } from "react";
import { TokenBreakout } from "./game";

export function BreakoutGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    let instance: TokenBreakout | null = null;
    let cancelled = false;
    let maxLevel = 1;

    const boot = async () => {
      if (typeof document !== "undefined" && "fonts" in document) {
        try {
          await document.fonts.ready;
        } catch {
          // font load failures are non-fatal, canvas falls back to system mono
        }
      }
      if (cancelled) return;
      instance = new TokenBreakout(canvas, {
        onEvent: (event) => {
          if (event.type === "level-cleared") {
            maxLevel = Math.max(maxLevel, event.level + 1);
          }
        },
      });
    };

    void boot();

    return () => {
      cancelled = true;
      if (instance !== null) {
        instance.destroy();
        instance = null;
      }
    };
  }, []);

  return (
    <div className="text-foreground grid aspect-4/3 w-full place-items-center bg-black p-3 font-mono">
      <canvas
        ref={canvasRef}
        className="ring-foreground/10 block h-full max-h-full w-full max-w-full rounded-lg ring-1 [image-rendering:crisp-edges]"
        aria-label="Token Breakout text-rendered block breaker game"
      />
    </div>
  );
}
