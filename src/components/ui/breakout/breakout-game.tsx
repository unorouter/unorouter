"use client";

import { useEffect, useRef } from "react";
import { PretextBreaker } from "./game";

export function BreakoutGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    let instance: PretextBreaker | null = null;
    let cancelled = false;

    const boot = async () => {
      if (typeof document !== "undefined" && "fonts" in document) {
        try {
          await document.fonts.ready;
        } catch {
          // font load failures are non-fatal, canvas falls back to system mono
        }
      }
      if (cancelled) return;
      instance = new PretextBreaker(canvas);
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
    <div className="font-mono text-foreground grid aspect-4/3 w-full place-items-center bg-black p-3">
      <canvas
        ref={canvasRef}
        className="ring-foreground/10 block h-full max-h-full w-full max-w-full rounded-lg ring-1 [image-rendering:crisp-edges]"
        aria-label="Pretext Breaker text-rendered block breaker game"
      />
    </div>
  );
}
