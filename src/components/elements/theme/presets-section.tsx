"use client";

import { StyleGlyph } from "@/components/elements/theme/glyphs";
import { ColorSwatch, Picker } from "@/components/elements/theme/picker";
import { TokenField } from "@/components/elements/theme/token-field";
import type { ThemeEditor } from "@/hooks/ui/use-theme-editor-hook";
import {
  ACCENTS,
  CUSTOM,
  DEFAULT,
  PALETTES,
  STYLES,
  findAccent,
  findPalette,
} from "@/lib/theme/presets";
import { TOKEN_BY_ID } from "@/lib/theme/tokens";
import { useTranslations } from "next-intl";

const CUSTOM_FALLBACK = "#7c3aed";

function GeneratorField(props: { editor: ThemeEditor; id: string }) {
  return <TokenField def={TOKEN_BY_ID.get(props.id)!} editor={props.editor} />;
}

export function PresetsSection(props: { editor: ThemeEditor }) {
  const t = useTranslations();
  const { editor } = props;
  const mode = editor.mode;
  const presets = editor.theme.presets;
  const custom = { value: CUSTOM, label: t("THEME.CUSTOM_COLOR") };
  const none = { value: DEFAULT, label: t("THEME.PRESET.DEFAULT") };

  const palette = findPalette(presets.palette);
  const paletteSwatch = editor.isCustom("palette")
    ? String(editor.read(TOKEN_BY_ID.get("palette-base")!) ?? CUSTOM_FALLBACK)
    : (palette?.base[mode] ??
      String(editor.effective.background ?? "transparent"));
  const accent = findAccent(presets.accent);
  const accentSwatch = editor.isCustom("accent")
    ? String(editor.read(TOKEN_BY_ID.get("accent-base")!) ?? CUSTOM_FALLBACK)
    : (accent?.hex[mode] ??
      palette?.accent?.[mode] ??
      String(editor.effective.primary ?? "transparent"));

  return (
    <>
      <Picker
        label={t("THEME.STYLE")}
        value={presets.style ?? DEFAULT}
        valueLabel={
          STYLES.find((s) => s.id === presets.style)?.label ??
          t("THEME.PRESET.DEFAULT")
        }
        options={[
          none,
          ...STYLES.map((s) => ({ value: s.id, label: s.label })),
        ]}
        rightAdornment={<StyleGlyph />}
        onValueChange={(v) => editor.setPreset("style", v)}
      />
      <Picker
        label={t("THEME.PRESET.PALETTE")}
        value={presets.palette ?? DEFAULT}
        valueLabel={
          editor.isCustom("palette")
            ? t("THEME.CUSTOM_COLOR")
            : (palette?.label ?? t("THEME.PRESET.DEFAULT"))
        }
        options={[
          none,
          ...PALETTES.map((p) => ({
            value: p.id,
            label: p.label,
            swatch: p.base[mode],
          })),
          custom,
        ]}
        rightAdornment={<ColorSwatch value={paletteSwatch} />}
        onValueChange={(v) => editor.setPreset("palette", v)}
      />
      {editor.isCustom("palette") && (
        <GeneratorField editor={editor} id="palette-base" />
      )}
      <Picker
        label={t("THEME.PRESET.ACCENT")}
        value={presets.accent ?? DEFAULT}
        valueLabel={
          editor.isCustom("accent")
            ? t("THEME.CUSTOM_COLOR")
            : (accent?.label ?? t("THEME.PRESET.DEFAULT"))
        }
        options={[
          none,
          ...ACCENTS.map((a) => ({
            value: a.id,
            label: a.label,
            swatch: a.hex[mode],
          })),
          custom,
        ]}
        rightAdornment={<ColorSwatch value={accentSwatch} />}
        onValueChange={(v) => editor.setPreset("accent", v)}
      />
      {editor.isCustom("accent") && (
        <GeneratorField editor={editor} id="accent-base" />
      )}
    </>
  );
}

export function ChartPresetSection(props: { editor: ThemeEditor }) {
  const t = useTranslations();
  const { editor } = props;
  const presets = editor.theme.presets;
  const chart = findAccent(presets.chart);
  const shades = [1, 2, 3, 4, 5].map((i) =>
    String(editor.effective[`chart-${i}`] ?? `var(--chart-${i})`),
  );
  return (
    <>
      <p className="text-muted-foreground px-1 text-[11px]">
        {t("THEME.PRESET.CHART_HINT")}
      </p>
      <Picker
        label={t("THEME.PRESET.CHART")}
        value={presets.chart ?? DEFAULT}
        valueLabel={
          editor.isCustom("chart")
            ? t("THEME.CUSTOM_COLOR")
            : (chart?.label ?? t("THEME.PRESET.FOLLOW_ACCENT"))
        }
        options={[
          { value: DEFAULT, label: t("THEME.PRESET.FOLLOW_ACCENT") },
          ...ACCENTS.map((a) => ({
            value: a.id,
            label: a.label,
            swatch: a.hex[editor.mode],
          })),
          { value: CUSTOM, label: t("THEME.CUSTOM_COLOR") },
        ]}
        rightAdornment={
          <span className="flex h-4 items-end gap-px" aria-hidden>
            {shades.map((c, i) => (
              <span
                key={i}
                className="w-1 rounded-sm"
                style={{ height: `${40 + i * 15}%`, backgroundColor: c }}
              />
            ))}
          </span>
        }
        onValueChange={(v) => editor.setPreset("chart", v)}
      />
      {editor.isCustom("chart") && (
        <GeneratorField editor={editor} id="chart-base" />
      )}
    </>
  );
}
