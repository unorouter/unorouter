"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

const LINE_COUNT_DESKTOP = 40;
const LINE_COUNT_MOBILE = 15;

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
  gradient: CanvasGradient | null;
  gradientX: number;
};

export function StreakCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const themeRef = useRef(resolvedTheme);

  useEffect(() => {
    themeRef.current = resolvedTheme;
    linesRef.current.forEach((l) => {
      l.gradient = null;
    });
  }, [resolvedTheme]);

  const linesRef = useRef<Line[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = 0;
    let height = 0;
    let paused = false;

    const isMobile = () => window.innerWidth < 768;

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

      linesRef.current[index] = {
        x: initial ? Math.random() * width : -Math.random() * 500 - 200,
        y: Math.random() * height,
        speed: Math.random() * 8 + 5,
        width: Math.random() * 2 + 0.5,
        length: Math.random() * 400 + 100,
        color,
        gradient: null,
        gradientX: -Infinity,
      };
    };

    const init = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      const count = isMobile() ? LINE_COUNT_MOBILE : LINE_COUNT_DESKTOP;
      linesRef.current = [];
      for (let n = 0; n < count; n++) {
        spawnLine(n, true);
      }
    };

    const animate = () => {
      if (paused) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      const { transparent } = getColors();
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < linesRef.current.length; i++) {
        const line = linesRef.current[i];
        line.x += line.speed;

        if (line.x > width + line.length) {
          spawnLine(i);
          continue;
        }

        if (!line.gradient || Math.abs(line.x - line.gradientX) > 20) {
          const g = ctx.createLinearGradient(
            line.x - line.length,
            line.y,
            line.x,
            line.y,
          );
          g.addColorStop(0, transparent);
          g.addColorStop(0.2, transparent);
          g.addColorStop(0.8, line.color);
          g.addColorStop(1, transparent);
          line.gradient = g;
          line.gradientX = line.x;
        }

        ctx.fillStyle = line.gradient;
        ctx.fillRect(line.x - line.length, line.y, line.length, line.width);
      }

      animationId = requestAnimationFrame(animate);
    };

    const onVisibilityChange = () => {
      paused = document.hidden;
    };

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(init, 150);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", onResize);
    init();
    animate();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="bg-background pointer-events-none fixed inset-0 z-0">
      <canvas ref={canvasRef} className="h-full w-full opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_100%)] opacity-80" />
    </div>
  );
}
