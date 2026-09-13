// Every palette, preset or custom, comes out of this one generator, so the two
// can never differ in which variables they set.

export type Oklch = { l: number; c: number; h: number };

const HEX_RE = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export function normHex(v: string | number | undefined): string | null {
  if (v === undefined) return null;
  const m = HEX_RE.exec(String(v).trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  return `#${h.toLowerCase()}`;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function hexToOklch(hex: string): Oklch {
  const r = srgbToLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = srgbToLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = srgbToLinear(parseInt(hex.slice(5, 7), 16) / 255);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.hypot(a, bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c: c < 1e-4 ? 0 : c, h: c < 1e-4 ? 0 : h };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function css(o: Oklch): string {
  return `oklch(${clamp01(o.l).toFixed(3)} ${o.c.toFixed(3)} ${o.h.toFixed(1)})`;
}

function contrastText(o: Oklch): Oklch {
  return o.l > 0.6
    ? { l: 0.15, c: Math.min(o.c, 0.04), h: o.h }
    : { l: 0.97, c: Math.min(o.c, 0.02), h: o.h };
}

export function chartShades(
  hex: string,
  light: boolean,
): Record<string, string> {
  const lift = light ? "black" : "white";
  const drop = light ? "white" : "black";
  return {
    "chart-1": `color-mix(in oklab, ${hex} 55%, ${lift})`,
    "chart-2": `color-mix(in oklab, ${hex} 78%, ${lift})`,
    "chart-3": hex,
    "chart-4": `color-mix(in oklab, ${hex} 78%, ${drop})`,
    "chart-5": `color-mix(in oklab, ${hex} 55%, ${drop})`,
  };
}

export function accentVars(hex: string): Record<string, string> {
  const fg = css(contrastText(hexToOklch(hex)));
  return {
    primary: hex,
    "primary-foreground": fg,
    ring: hex,
    "sidebar-primary": hex,
    "sidebar-primary-foreground": fg,
  };
}

// The whole surface set from one base colour. Shifts run toward the contrast
// side, so a light base darkens into cards and borders and a dark base lightens.
export function generatePalette(baseHex: string): Record<string, string> {
  const base = hexToOklch(baseHex);
  const light = base.l > 0.6;
  const dir = light ? -1 : 1;
  const tint = Math.min(base.c, 0.05);
  const step = (k: number, chroma = tint): Oklch => ({
    l: clamp01(base.l + dir * k),
    c: chroma,
    h: base.h,
  });
  const fg = contrastText(base);
  const foreground = css(fg);
  const mutedFg = css(light ? { ...fg, l: 0.5 } : { ...fg, l: 0.72 });
  const surface = css(step(0.03));
  const muted = css(step(0.07));
  const accent = css(step(0.09));
  const border = css(step(0.12));
  const input = css(step(0.14));
  const sidebar = css(step(0.02));
  return {
    background: baseHex,
    foreground,
    card: surface,
    "card-foreground": foreground,
    popover: surface,
    "popover-foreground": foreground,
    primary: foreground,
    "primary-foreground": baseHex,
    secondary: muted,
    "secondary-foreground": foreground,
    muted,
    "muted-foreground": mutedFg,
    accent,
    "accent-foreground": foreground,
    border,
    input,
    ring: css(step(0.3)),
    sidebar,
    "sidebar-foreground": foreground,
    "sidebar-primary": foreground,
    "sidebar-primary-foreground": baseHex,
    "sidebar-accent": muted,
    "sidebar-accent-foreground": foreground,
    "sidebar-border": border,
    "sidebar-ring": css(step(0.3)),
  };
}
