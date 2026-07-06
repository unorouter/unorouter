function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % 360;
}

export function modelColor(name: string): string {
  return `hsl(${nameToHue(name)} 70% 50%)`;
}

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
