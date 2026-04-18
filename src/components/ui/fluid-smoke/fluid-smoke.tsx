"use client";

import { prepareWithSegments } from "@chenglou/pretext";
import { useEffect, useRef } from "react";

const FONT_SIZE = 14;
const LINE_HEIGHT = 17;
const PROP_FAMILY =
  'Georgia, Palatino, "Times New Roman", serif';
const CHARSET =
  " .,:;!+-=*#@%&abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const WEIGHTS = [300, 500, 800] as const;
const STYLES = ["normal", "italic"] as const;
const MAX_COLS = 160;
const MAX_ROWS = 64;

type PaletteEntry = {
  char: string;
  font: string;
  width: number;
  brightness: number;
};

type Palette = {
  entries: PaletteEntry[];
  avgCharW: number;
  aspect: number;
  aspect2: number;
  spaceW: number;
};

let cachedPalette: Palette | null = null;

function buildPalette(): Palette {
  if (cachedPalette !== null) return cachedPalette;

  const brightnessCanvas = document.createElement("canvas");
  brightnessCanvas.width = brightnessCanvas.height = 28;
  const brightnessCtx = brightnessCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  if (brightnessCtx === null) {
    throw new Error("no 2d context");
  }

  const entries: PaletteEntry[] = [];
  for (const style of STYLES) {
    for (const weight of WEIGHTS) {
      const font = `${style === "italic" ? "italic " : ""}${weight} ${FONT_SIZE}px ${PROP_FAMILY}`;
      for (const ch of CHARSET) {
        if (ch === " ") continue;
        const p = prepareWithSegments(ch, font);
        const width = p.widths.length > 0 ? p.widths[0] : 0;
        if (width <= 0) continue;

        brightnessCtx.clearRect(0, 0, 28, 28);
        brightnessCtx.font = font;
        brightnessCtx.fillStyle = "#fff";
        brightnessCtx.textBaseline = "middle";
        brightnessCtx.fillText(ch, 1, 14);
        const data = brightnessCtx.getImageData(0, 0, 28, 28).data;
        let sum = 0;
        for (let i = 3; i < data.length; i += 4) sum += data[i];
        const brightness = sum / (255 * 784);

        entries.push({ char: ch, font, width, brightness });
      }
    }
  }

  const maxB = Math.max(...entries.map((e) => e.brightness));
  if (maxB > 0) for (const e of entries) e.brightness /= maxB;
  entries.sort((a, b) => a.brightness - b.brightness);

  const avgCharW = entries.reduce((s, e) => s + e.width, 0) / entries.length;
  const aspect = avgCharW / LINE_HEIGHT;

  cachedPalette = {
    entries,
    avgCharW,
    aspect,
    aspect2: aspect * aspect,
    spaceW: FONT_SIZE * 0.27,
  };
  return cachedPalette;
}

function findBest(
  palette: PaletteEntry[],
  targetB: number,
  targetW: number,
): PaletteEntry {
  let lo = 0;
  let hi = palette.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (palette[mid].brightness < targetB) lo = mid + 1;
    else hi = mid;
  }
  let bestScore = Infinity;
  let best = palette[lo];
  for (
    let i = Math.max(0, lo - 15);
    i < Math.min(palette.length, lo + 15);
    i++
  ) {
    const p = palette[i];
    const score =
      Math.abs(p.brightness - targetB) * 2.5 +
      Math.abs(p.width - targetW) / targetW;
    if (score < bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

const EMITTERS = [
  { cx: 0.2, cy: 0.35, orbitR: 0.16, freq: 0.3, phase: 0, strength: 0.36 },
  { cx: 0.5, cy: 0.5, orbitR: 0.18, freq: 0.22, phase: 1.3, strength: 0.4 },
  { cx: 0.75, cy: 0.3, orbitR: 0.12, freq: 0.28, phase: 2.1, strength: 0.32 },
  { cx: 0.35, cy: 0.7, orbitR: 0.18, freq: 0.35, phase: 4.2, strength: 0.38 },
  { cx: 0.8, cy: 0.65, orbitR: 0.1, freq: 0.4, phase: 1, strength: 0.3 },
  { cx: 0.15, cy: 0.75, orbitR: 0.1, freq: 0.32, phase: 5.5, strength: 0.28 },
];

export function FluidSmoke() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas === null || container === null) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    if (prefersReduced.matches) return;

    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    const palette = buildPalette();
    const colorVar =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--muted-foreground")
        .trim() || "oklch(0.7 0 0)";

    let cols = 0;
    let rows = 0;
    let density = new Float32Array(0);
    let temp = new Float32Array(0);
    let rafId = 0;
    let running = true;
    let dpr = 1;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cols = Math.min(MAX_COLS, Math.floor(rect.width / palette.avgCharW));
      rows = Math.min(MAX_ROWS, Math.floor(rect.height / LINE_HEIGHT));
      if (cols <= 0 || rows <= 0) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      density = new Float32Array(cols * rows);
      temp = new Float32Array(cols * rows);
    };

    const updateSim = (t: number) => {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const nx = c / cols;
          const ny = r / rows;
          const vx =
            Math.sin(ny * 6.28 + t * 0.3) * 2 +
            Math.cos((nx + ny) * 12.5 + t * 0.55) * 0.7 +
            Math.sin(nx * 25 + ny * 18 + t * 0.8) * 0.25;
          let vy =
            Math.cos(nx * 5 + t * 0.4) * 1.5 +
            Math.sin((nx - ny) * 10 + t * 0.4) * 0.8 +
            Math.cos(nx * 18 - ny * 25 + t * 0.7) * 0.25;
          vy *= palette.aspect;
          const sx = Math.max(0, Math.min(cols - 1.001, c - vx));
          const sy = Math.max(0, Math.min(rows - 1.001, r - vy));
          const x0 = sx | 0;
          const y0 = sy | 0;
          const x1 = Math.min(x0 + 1, cols - 1);
          const y1 = Math.min(y0 + 1, rows - 1);
          const fx = sx - x0;
          const fy = sy - y0;
          temp[r * cols + c] =
            density[y0 * cols + x0] * (1 - fx) * (1 - fy) +
            density[y0 * cols + x1] * fx * (1 - fy) +
            density[y1 * cols + x0] * (1 - fx) * fy +
            density[y1 * cols + x1] * fx * fy;
        }
      }
      [density, temp] = [temp, density];

      for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
          const i = r * cols + c;
          const avg =
            (density[i - 1] +
              density[i + 1] +
              (density[i - cols] + density[i + cols]) * palette.aspect2) /
            (2 + 2 * palette.aspect2);
          temp[i] = density[i] * 0.92 + avg * 0.08;
        }
      }
      [density, temp] = [temp, density];

      const spread = 4;
      for (const e of EMITTERS) {
        const ex = (e.cx + Math.cos(t * e.freq + e.phase) * e.orbitR) * cols;
        const ey =
          (e.cy + Math.sin(t * e.freq * 0.7 + e.phase) * e.orbitR * 0.8) * rows;
        const ec = ex | 0;
        const er = ey | 0;
        for (let dr = -spread; dr <= spread; dr++) {
          for (let dc = -spread; dc <= spread; dc++) {
            const rr = er + dr;
            const cc = ec + dc;
            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
              const drScaled = dr / palette.aspect;
              const dist = Math.sqrt(drScaled * drScaled + dc * dc);
              const s = Math.max(0, 1 - dist / (spread + 1));
              density[rr * cols + cc] = Math.min(
                1,
                density[rr * cols + cc] + s * e.strength,
              );
            }
          }
        }
      }

      for (let i = 0; i < cols * rows; i++) density[i] *= 0.992;
    };

    const render = (now: number) => {
      if (!running) return;
      const t = now / 1000;
      updateSim(t);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      ctx.textBaseline = "middle";
      const cellH = LINE_HEIGHT;
      const tcw = (canvas.width / dpr) / cols;
      const rowWidths: number[] = [];
      const rowChars: { x: number; char: string; font: string; alpha: number }[][] = [];
      for (let r = 0; r < rows; r++) {
        const chars: { x: number; char: string; font: string; alpha: number }[] = [];
        let tw = 0;
        for (let c = 0; c < cols; c++) {
          const b = density[r * cols + c];
          if (b < 0.025) {
            tw += palette.spaceW;
            continue;
          }
          const m = findBest(palette.entries, b, tcw);
          const alpha = Math.min(0.55, b * b * 0.9);
          chars.push({ x: tw, char: m.char, font: m.font, alpha });
          tw += m.width;
        }
        rowChars.push(chars);
        rowWidths.push(tw);
      }
      const viewW = canvas.width / dpr;
      const maxW = Math.max(...rowWidths, 1);
      const blockOffset = Math.max(0, (viewW - maxW) / 2);
      for (let r = 0; r < rows; r++) {
        const y = r * cellH + cellH / 2;
        const pad = blockOffset + (maxW - rowWidths[r]) / 2;
        for (const ch of rowChars[r]) {
          if (ch.alpha < 0.015) continue;
          ctx.font = ch.font;
          ctx.fillStyle = `color-mix(in oklch, ${colorVar} ${(ch.alpha * 100).toFixed(1)}%, transparent)`;
          ctx.fillText(ch.char, pad + ch.x, y);
        }
      }
      rafId = requestAnimationFrame(render);
    };

    resize();

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries[0].isIntersecting;
        if (visible && running) {
          rafId = requestAnimationFrame(render);
        } else {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      },
      { threshold: 0 },
    );
    observer.observe(container);

    const onResize = () => {
      resize();
    };
    window.addEventListener("resize", onResize);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
