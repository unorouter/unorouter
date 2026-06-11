"use client";

import {
  AccentGlyph,
  MenuGlyph,
  StyleGlyph,
} from "@/components/ui/theme/customizer/glyphs";
import { FieldSeparator } from "@/components/ui/theme/field";
import {
  ColorSwatch,
  FontGlyph,
  Picker,
  RadiusGlyph,
  type PickerOption,
} from "@/components/ui/theme/picker";
import { STYLES } from "@/components/ui/theme/shadcn-styles";
import {
  ALL_BASE_COLORS,
  ALL_THEMES,
  ICON_LIBRARIES,
  MENU_ACCENTS,
  MENUS,
  RADII,
} from "@/components/ui/theme/shadcn-themes";
import { FONT_OPTIONS } from "@/components/ui/theme/theme-fonts";
import {
  INITIAL_USER_THEME,
  type UserTheme,
} from "@/components/ui/theme/theme-store";
import { useTranslations } from "next-intl";
import type { FC, ReactNode } from "react";

// Project palette fallbacks for the "default" sentinel (empty cssVars). Match
// globals.css `--primary` and `--muted-foreground` so chips render as real swatches.
const DEFAULT_PRIMARY = "#18181b";
const DEFAULT_MUTED = "#71717a";

function themeChipColor(name: string): string {
  const t = ALL_THEMES.find((x) => x.name === name);
  return t?.cssVars.light.primary ?? t?.cssVars.dark.primary ?? DEFAULT_PRIMARY;
}

function baseColorChipColor(name: string): string {
  const t = ALL_BASE_COLORS.find((x) => x.name === name);
  return t?.cssVars.light["muted-foreground"] ?? DEFAULT_MUTED;
}

type T = (key: string) => string;

type PickerSpec = {
  /** UserTheme field this picker edits. */
  field: keyof UserTheme & string;
  labelKey: string;
  separatorBefore?: boolean;
  options: (t: T) => PickerOption[];
  valueLabel: (value: string, t: T) => string;
  adornment: (value: string) => ReactNode;
};

const fontOptions = (kind: "sans" | "display", inheritLabel: string) => [
  { value: "inherit", label: inheritLabel },
  ...FONT_OPTIONS.filter((f) => f.kinds.includes(kind)).map((f) => ({
    value: f.id,
    label: f.label,
  })),
];

const fontLabel = (value: string, inheritLabel: string) =>
  value === "inherit"
    ? inheritLabel
    : (FONT_OPTIONS.find((f) => f.id === value)?.label ?? inheritLabel);

const PICKERS: PickerSpec[] = [
  {
    field: "style",
    labelKey: "THEME.STYLE",
    options: () => STYLES.map((s) => ({ value: s.name, label: s.label })),
    valueLabel: (v) => STYLES.find((s) => s.name === v)?.label ?? "",
    adornment: () => <StyleGlyph />,
  },
  {
    field: "baseColor",
    labelKey: "THEME.BASE_COLOR",
    separatorBefore: true,
    options: () =>
      ALL_BASE_COLORS.map((b) => ({
        value: b.name,
        label: b.title,
        swatch: baseColorChipColor(b.name),
      })),
    valueLabel: (v) => ALL_BASE_COLORS.find((b) => b.name === v)?.title ?? "",
    adornment: (v) => <ColorSwatch value={baseColorChipColor(v)} />,
  },
  {
    field: "theme",
    labelKey: "THEME.THEME",
    options: () =>
      ALL_THEMES.map((x) => ({
        value: x.name,
        label: x.title,
        swatch: themeChipColor(x.name),
      })),
    valueLabel: (v) => ALL_THEMES.find((x) => x.name === v)?.title ?? "",
    adornment: (v) => <ColorSwatch value={themeChipColor(v)} />,
  },
  {
    field: "chartColor",
    labelKey: "THEME.CHART_COLOR",
    options: () =>
      ALL_THEMES.map((x) => ({
        value: x.name,
        label: x.title,
        swatch: themeChipColor(x.name),
      })),
    valueLabel: (v) => ALL_THEMES.find((x) => x.name === v)?.title ?? "",
    adornment: (v) => <ColorSwatch value={themeChipColor(v)} />,
  },
  {
    field: "fontHeading",
    labelKey: "THEME.HEADING_FONT",
    separatorBefore: true,
    options: (t) => fontOptions("display", t("THEME.FONT_HEADING_INHERIT")),
    valueLabel: (v, t) => fontLabel(v, t("THEME.FONT_HEADING_INHERIT")),
    adornment: () => <FontGlyph />,
  },
  {
    field: "fontBody",
    labelKey: "THEME.BODY_FONT",
    options: (t) => fontOptions("sans", t("THEME.FONT_DEFAULT")),
    valueLabel: (v, t) => fontLabel(v, t("THEME.FONT_DEFAULT")),
    adornment: () => <FontGlyph />,
  },
  {
    field: "iconLibrary",
    labelKey: "THEME.ICON_LIBRARY",
    separatorBefore: true,
    options: () =>
      ICON_LIBRARIES.map((i) => ({ value: i.name, label: i.label })),
    valueLabel: (v) =>
      ICON_LIBRARIES.find((i) => i.name === v)?.label ?? "Lucide",
    adornment: () => <StyleGlyph />,
  },
  {
    field: "radius",
    labelKey: "THEME.RADIUS",
    options: () => RADII.map((r) => ({ value: r.name, label: r.label })),
    valueLabel: (v) => RADII.find((r) => r.name === v)?.label ?? "Default",
    adornment: (v) => (
      <RadiusGlyph
        radius={
          parseFloat(RADII.find((r) => r.name === v)?.value || "0.625") || 0.625
        }
      />
    ),
  },
  {
    field: "menu",
    labelKey: "THEME.MENU",
    separatorBefore: true,
    options: () => MENUS.map((m) => ({ value: m.name, label: m.label })),
    valueLabel: (v) => MENUS.find((m) => m.name === v)?.label ?? "",
    adornment: () => <MenuGlyph />,
  },
  {
    field: "menuAccent",
    labelKey: "THEME.MENU_ACCENT",
    options: () => MENU_ACCENTS.map((m) => ({ value: m.name, label: m.label })),
    valueLabel: (v) => MENU_ACCENTS.find((m) => m.name === v)?.label ?? "",
    adornment: () => <AccentGlyph />,
  },
];

export const RegistryPickers: FC<{
  theme: UserTheme;
  setTheme: (next: UserTheme) => void;
}> = (props) => {
  const t = useTranslations() as unknown as T;
  return (
    <>
      {PICKERS.map((spec) => {
        const value = String(
          props.theme[spec.field] ?? INITIAL_USER_THEME[spec.field] ?? "",
        );
        return (
          <div key={spec.field} className="contents">
            {spec.separatorBefore && <FieldSeparator />}
            <Picker
              label={t(spec.labelKey)}
              value={value}
              valueLabel={spec.valueLabel(value, t)}
              options={spec.options(t)}
              rightAdornment={spec.adornment(value)}
              onValueChange={(v) =>
                props.setTheme({ ...props.theme, [spec.field]: v })
              }
            />
          </div>
        );
      })}
    </>
  );
};
