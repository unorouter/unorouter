export type ShadcnStyle = {
  name: string;
  label: string;
  radiusScale: number;
  shadow: string;
  hoverLift: number;
};

export const STYLES: ShadcnStyle[] = [
  {
    name: "vega",
    label: "Vega",
    radiusScale: 0.5,
    shadow: "0 1px 2px rgb(0 0 0 / 0.05)",
    hoverLift: 0,
  },
  {
    name: "nova",
    label: "Nova",
    radiusScale: 1.0,
    shadow: "0 1px 3px rgb(0 0 0 / 0.1)",
    hoverLift: 1,
  },
  {
    name: "maia",
    label: "Maia",
    radiusScale: 1.2,
    shadow: "0 4px 12px rgb(0 0 0 / 0.08)",
    hoverLift: 1,
  },
  {
    name: "lyra",
    label: "Lyra",
    radiusScale: 0,
    shadow: "none",
    hoverLift: 0,
  },
  {
    name: "mira",
    label: "Mira",
    radiusScale: 1.5,
    shadow: "0 8px 24px rgb(0 0 0 / 0.06)",
    hoverLift: 2,
  },
  {
    name: "luma",
    label: "Luma",
    radiusScale: 2.0,
    shadow: "0 6px 16px rgb(0 0 0 / 0.08)",
    hoverLift: 1,
  },
  {
    name: "sera",
    label: "Sera",
    radiusScale: 0,
    shadow: "0 1px 2px rgb(0 0 0 / 0.08)",
    hoverLift: 0,
  },
];

export function findStyle(name: string | undefined): ShadcnStyle | null {
  if (!name) return null;
  return STYLES.find((s) => s.name === name) ?? null;
}
