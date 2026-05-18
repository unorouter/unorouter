/**
 * Deterministic hue (0-360) for a given string. djb2-style hash so similar
 * names (e.g. gpt-5.4 / gpt-5.4-mini) get noticeably different hues. Use this
 * to keep per-model colors stable across charts, log badges, reloads.
 */
export function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % 360;
}

/** Solid HSL color for a model name. Use for chart fills, lines, bars. */
export function modelColor(name: string): string {
  return `hsl(${nameToHue(name)} 70% 50%)`;
}

/** Badge style for a model name: tinted background + readable text color. */
export function modelColorStyle(name: string): {
  backgroundColor: string;
  color: string;
} {
  const hue = nameToHue(name);
  return {
    backgroundColor: `hsl(${hue} 85% 50% / 0.15)`,
    color: `hsl(${hue} 70% 40%)`,
  };
}
