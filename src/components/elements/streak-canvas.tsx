"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

const LINE_COUNT = 40;

const DARK_COLORS = ["#ffffff", "#d4d4d4", "#a3a3a3", "#525252", "#22c55e"];
const DARK_ACCENT = "#22c55e";
const DARK_TRANSPARENT = "rgba(255,255,255,0)";

const LIGHT_COLORS = ["#09090b", "#3f3f46", "#71717a", "#a1a1aa", "#16a34a"];
const LIGHT_ACCENT = "#16a34a";
const LIGHT_TRANSPARENT = "rgba(0,0,0,0)";

type Line = {
  x: number;
  y: number;
  speed: number;
  width: number;
  length: number;
  color: string;
};

export function StreakCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const themeRef = useRef(resolvedTheme);

  useEffect(() => {
    themeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = 0;
    let height = 0;
    const lines: Line[] = [];

    const getColors = () => {
      const isDark = themeRef.current === "dark";
      return {
        colors: isDark ? DARK_COLORS : LIGHT_COLORS,
        accent: isDark ? DARK_ACCENT : LIGHT_ACCENT,
        transparent: isDark ? DARK_TRANSPARENT : LIGHT_TRANSPARENT,
      };
    };

    const spawnLine = (index: number, initial = false) => {
      const { colors, accent } = getColors();
      const color =
        Math.random() > 0.9
          ? accent
          : colors[Math.floor(Math.random() * (colors.length - 1))];

      lines[index] = {
        x: initial ? Math.random() * width : -Math.random() * 500 - 200,
        y: Math.random() * height,
        speed: Math.random() * 8 + 5,
        width: Math.random() * 2 + 0.5,
        length: Math.random() * 400 + 100,
        color,
      };
    };

    const init = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      lines.length = 0;
      for (let n = 0; n < LINE_COUNT; n++) {
        spawnLine(n, true);
      }
    };

    const animate = () => {
      const { transparent } = getColors();
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        line.x += line.speed;

        if (line.x > width + line.length) {
          spawnLine(i);
          continue;
        }

        const gradient = ctx.createLinearGradient(
          line.x - line.length,
          line.y,
          line.x,
          line.y
        );
        gradient.addColorStop(0, transparent);
        gradient.addColorStop(0.2, transparent);
        gradient.addColorStop(0.8, line.color);
        gradient.addColorStop(1, transparent);

        ctx.fillStyle = gradient;
        ctx.fillRect(line.x - line.length, line.y, line.length, line.width);
      }

      animationId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", init);
    init();
    animate();

    return () => {
      window.removeEventListener("resize", init);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-background">
      <canvas ref={canvasRef} className="w-full h-full opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_100%)] opacity-80" />
    </div>
  );
}
