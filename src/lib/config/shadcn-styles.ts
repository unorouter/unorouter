// Style presets. Each style only tweaks a few CSS vars (radius scale,
// shadow density, border opacity). Real visual difference at the cost
// of not being a full per-component package swap. Applied via
// `data-style` attribute on <html> by UserThemeProvider.

export type ShadcnStyle = {
  name: string;
  label: string;
  /** Multiplier applied to base --radius. */
  radiusScale: number;
  /** Shadow shorthand for box-shadow on Cards/Popovers. */
  shadow: string;
  /** Border opacity on inputs/cards. */
  borderOpacity: number;
  /** translateY on button :hover/:active. */
  hoverLift: number;
};

export const STYLES: ShadcnStyle[] = [
  {
    name: "vega",
    label: "Vega",
    radiusScale: 0.5,
    shadow: "0 1px 2px rgb(0 0 0 / 0.05)",
    borderOpacity: 0.05,
    hoverLift: 0,
  },
  {
    name: "nova",
    label: "Nova",
    radiusScale: 1.0,
    shadow: "0 1px 3px rgb(0 0 0 / 0.1)",
    borderOpacity: 0.1,
    hoverLift: 1,
  },
  {
    name: "maia",
    label: "Maia",
    radiusScale: 1.2,
    shadow: "0 4px 12px rgb(0 0 0 / 0.08)",
    borderOpacity: 0.08,
    hoverLift: 1,
  },
  {
    name: "lyra",
    label: "Lyra",
    radiusScale: 0,
    shadow: "none",
    borderOpacity: 0.15,
    hoverLift: 0,
  },
  {
    name: "mira",
    label: "Mira",
    radiusScale: 1.5,
    shadow: "0 8px 24px rgb(0 0 0 / 0.06)",
    borderOpacity: 0.05,
    hoverLift: 2,
  },
  {
    name: "luma",
    label: "Luma",
    radiusScale: 2.0,
    shadow: "0 6px 16px rgb(0 0 0 / 0.08)",
    borderOpacity: 0.05,
    hoverLift: 1,
  },
  {
    name: "sera",
    label: "Sera",
    radiusScale: 0,
    shadow: "0 1px 2px rgb(0 0 0 / 0.08)",
    borderOpacity: 0.12,
    hoverLift: 0,
  },
];

export function findStyle(name: string | undefined): ShadcnStyle | null {
  if (!name) return null;
  return STYLES.find((s) => s.name === name) ?? null;
}
