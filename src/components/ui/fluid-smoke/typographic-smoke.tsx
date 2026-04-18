"use client";

import { prepareWithSegments } from "@chenglou/pretext";
import { useEffect, useRef } from "react";

const FONT_SIZE = 14;
const LINE_HEIGHT = 16;
const PROP_FAMILY = 'Georgia, Palatino, "Times New Roman", serif';
const CHARSET =
  " .,:;!+-=*#@%&abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const WEIGHTS = [300, 500, 800] as const;
const STYLES = ["normal", "italic"] as const;
const FIELD_OVERSAMPLE = 2;
const PARTICLE_N = 220;
const SPRITE_R = 18;
const ATTRACTOR_R = 14;
const LARGE_ATTRACTOR_R = 36;
const ATTRACTOR_FORCE_1 = 0.22;
const ATTRACTOR_FORCE_2 = 0.05;
const FIELD_DECAY = 0.9;
const LOOKUP_SIZE = 256;
const MAX_COLS = 140;
const MAX_ROWS = 56;

type PaletteEntry = {
  char: string;
  font: string;
  width: number;
  brightness: number;
};

type Palette = {
  entries: PaletteEntry[];
  lookup: PaletteEntry[];
  avgCharW: number;
};

type FieldStamp = {
  radiusX: number;
  radiusY: number;
  sizeX: number;
  sizeY: number;
  values: Float32Array;
};

let cachedPalette: Palette | null = null;

function buildPalette(): Palette {
  if (cachedPalette !== null) return cachedPalette;

  const bCanvas = document.createElement("canvas");
  bCanvas.width = 28;
  bCanvas.height = 28;
  const bCtx = bCanvas.getContext("2d", { willReadFrequently: true });
  if (bCtx === null) throw new Error("no 2d context");

  const entries: PaletteEntry[] = [];
  for (const style of STYLES) {
    for (const weight of WEIGHTS) {
      const font = `${style === "italic" ? "italic " : ""}${weight} ${FONT_SIZE}px ${PROP_FAMILY}`;
      for (const ch of CHARSET) {
        if (ch === " ") continue;
        const prepared = prepareWithSegments(ch, font);
        const width = prepared.widths.length > 0 ? prepared.widths[0] : 0;
        if (width <= 0) continue;

        bCtx.clearRect(0, 0, 28, 28);
        bCtx.font = font;
        bCtx.fillStyle = "#fff";
        bCtx.textBaseline = "middle";
        bCtx.fillText(ch, 1, 14);
        const data = bCtx.getImageData(0, 0, 28, 28).data;
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

  const lookup: PaletteEntry[] = new Array(LOOKUP_SIZE);
  for (let i = 0; i < LOOKUP_SIZE; i++) {
    const targetB = i / (LOOKUP_SIZE - 1);
    let lo = 0;
    let hi = entries.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (entries[mid].brightness < targetB) lo = mid + 1;
      else hi = mid;
    }
    lookup[i] = entries[lo];
  }

  const avgCharW = entries.reduce((s, e) => s + e.width, 0) / entries.length;
  cachedPalette = { entries, lookup, avgCharW };
  return cachedPalette;
}

function spriteAlphaAt(normalizedDistance: number): number {
  if (normalizedDistance >= 1) return 0;
  if (normalizedDistance <= 0.35)
    return 0.45 + (0.15 - 0.45) * (normalizedDistance / 0.35);
  return 0.15 * (1 - (normalizedDistance - 0.35) / 0.65);
}

function createFieldStamp(
  radiusPx: number,
  scaleX: number,
  scaleY: number,
): FieldStamp {
  const fieldRadiusX = radiusPx * scaleX;
  const fieldRadiusY = radiusPx * scaleY;
  const radiusX = Math.ceil(fieldRadiusX);
  const radiusY = Math.ceil(fieldRadiusY);
  const sizeX = radiusX * 2 + 1;
  const sizeY = radiusY * 2 + 1;
  const values = new Float32Array(sizeX * sizeY);
  for (let y = -radiusY; y <= radiusY; y++) {
    for (let x = -radiusX; x <= radiusX; x++) {
      const nd = Math.sqrt(
        (x / fieldRadiusX) ** 2 + (y / fieldRadiusY) ** 2,
      );
      values[(y + radiusY) * sizeX + x + radiusX] = spriteAlphaAt(nd);
    }
  }
  return { radiusX, radiusY, sizeX, sizeY, values };
}

type Particle = { x: number; y: number; vx: number; vy: number };

export function TypographicSmoke() {
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
    let fieldCols = 0;
    let fieldRows = 0;
    let canvasW = 0;
    let canvasH = 0;
    let fieldScaleX = 0;
    let fieldScaleY = 0;
    let brightnessField = new Float32Array(0);
    let particles: Particle[] = [];
    let particleStamp: FieldStamp | null = null;
    let largeAttractorStamp: FieldStamp | null = null;
    let smallAttractorStamp: FieldStamp | null = null;
    let rafId = 0;
    let running = true;
    let dpr = 1;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cols = Math.min(MAX_COLS, Math.max(16, Math.floor(rect.width / palette.avgCharW)));
      rows = Math.min(MAX_ROWS, Math.max(8, Math.floor(rect.height / LINE_HEIGHT)));
      fieldCols = cols * FIELD_OVERSAMPLE;
      fieldRows = rows * FIELD_OVERSAMPLE;
      canvasW = rect.width;
      canvasH = rect.height;
      fieldScaleX = fieldCols / canvasW;
      fieldScaleY = fieldRows / canvasH;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      brightnessField = new Float32Array(fieldCols * fieldRows);
      particleStamp = createFieldStamp(SPRITE_R, fieldScaleX, fieldScaleY);
      largeAttractorStamp = createFieldStamp(
        LARGE_ATTRACTOR_R,
        fieldScaleX,
        fieldScaleY,
      );
      smallAttractorStamp = createFieldStamp(
        ATTRACTOR_R,
        fieldScaleX,
        fieldScaleY,
      );
      if (particles.length === 0) {
        particles = [];
        for (let i = 0; i < PARTICLE_N; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 40 + 20;
          particles.push({
            x: canvasW / 2 + Math.cos(angle) * radius,
            y: canvasH / 2 + Math.sin(angle) * radius,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
          });
        }
      }
    };

    const splatStamp = (cx: number, cy: number, stamp: FieldStamp) => {
      const gcx = Math.round(cx * fieldScaleX);
      const gcy = Math.round(cy * fieldScaleY);
      for (let y = -stamp.radiusY; y <= stamp.radiusY; y++) {
        const gy = gcy + y;
        if (gy < 0 || gy >= fieldRows) continue;
        const fieldRow = gy * fieldCols;
        const stampRow = (y + stamp.radiusY) * stamp.sizeX;
        for (let x = -stamp.radiusX; x <= stamp.radiusX; x++) {
          const gx = gcx + x;
          if (gx < 0 || gx >= fieldCols) continue;
          const v = stamp.values[stampRow + x + stamp.radiusX];
          if (v === 0) continue;
          const idx = fieldRow + gx;
          brightnessField[idx] = Math.min(1, brightnessField[idx] + v);
        }
      }
    };

    const render = (now: number) => {
      if (!running) return;
      if (particleStamp === null || largeAttractorStamp === null || smallAttractorStamp === null) {
        rafId = requestAnimationFrame(render);
        return;
      }

      const a1x = Math.cos(now * 0.0007) * canvasW * 0.25 + canvasW / 2;
      const a1y = Math.sin(now * 0.0011) * canvasH * 0.3 + canvasH / 2;
      const a2x =
        Math.cos(now * 0.0013 + Math.PI) * canvasW * 0.2 + canvasW / 2;
      const a2y =
        Math.sin(now * 0.0009 + Math.PI) * canvasH * 0.25 + canvasH / 2;

      for (const p of particles) {
        const d1x = a1x - p.x;
        const d1y = a1y - p.y;
        const d2x = a2x - p.x;
        const d2y = a2y - p.y;
        const dist1 = d1x * d1x + d1y * d1y;
        const dist2 = d2x * d2x + d2y * d2y;
        const ax = dist1 < dist2 ? d1x : d2x;
        const ay = dist1 < dist2 ? d1y : d2y;
        const dist = Math.sqrt(Math.min(dist1, dist2)) + 1;
        const force = dist1 < dist2 ? ATTRACTOR_FORCE_1 : ATTRACTOR_FORCE_2;
        p.vx += (ax / dist) * force;
        p.vy += (ay / dist) * force;
        p.vx += (Math.random() - 0.5) * 0.25;
        p.vy += (Math.random() - 0.5) * 0.25;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -SPRITE_R) p.x += canvasW + SPRITE_R * 2;
        if (p.x > canvasW + SPRITE_R) p.x -= canvasW + SPRITE_R * 2;
        if (p.y < -SPRITE_R) p.y += canvasH + SPRITE_R * 2;
        if (p.y > canvasH + SPRITE_R) p.y -= canvasH + SPRITE_R * 2;
      }

      for (let i = 0; i < brightnessField.length; i++) {
        brightnessField[i] *= FIELD_DECAY;
      }
      for (const p of particles) splatStamp(p.x, p.y, particleStamp);
      splatStamp(a1x, a1y, largeAttractorStamp);
      splatStamp(a2x, a2y, smallAttractorStamp);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvasW, canvasH);
      ctx.textBaseline = "middle";

      const cellW = canvasW / cols;
      const cellH = LINE_HEIGHT;

      for (let row = 0; row < rows; row++) {
        const y = row * cellH + cellH / 2;
        const fieldRowStart = row * FIELD_OVERSAMPLE * fieldCols;
        for (let col = 0; col < cols; col++) {
          const fieldColStart = col * FIELD_OVERSAMPLE;
          let b = 0;
          for (let sy = 0; sy < FIELD_OVERSAMPLE; sy++) {
            const rowOff = fieldRowStart + sy * fieldCols + fieldColStart;
            for (let sx = 0; sx < FIELD_OVERSAMPLE; sx++) {
              b += brightnessField[rowOff + sx];
            }
          }
          b /= FIELD_OVERSAMPLE * FIELD_OVERSAMPLE;
          if (b < 0.015) continue;

          const lookupIdx = Math.min(
            LOOKUP_SIZE - 1,
            Math.max(0, (b * (LOOKUP_SIZE - 1)) | 0),
          );
          const m = palette.lookup[lookupIdx];
          const alpha = Math.min(0.32, b * 0.55);
          ctx.font = m.font;
          ctx.fillStyle = `color-mix(in oklch, ${colorVar} ${(alpha * 100).toFixed(1)}%, transparent)`;
          const x = col * cellW + (cellW - m.width) / 2;
          ctx.fillText(m.char, x, y);
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
