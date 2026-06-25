"use client";

import { ColorField } from "@/components/ui/theme/customizer/color-field";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ChatMarkdownColors,
  SurfaceColors,
} from "@/components/ui/theme/theme-store";
import { useTranslations } from "next-intl";

// Chat message font scale (accessibility). 1 = default; scales only message text.
const FONT_SCALE_MIN = 0.85;
const FONT_SCALE_MAX = 1.6;
const FONT_SCALE_STEP = 0.05;

export function FontSizeSection(props: {
  scale: number | undefined;
  onChange: (scale: number) => void;
}) {
  const t = useTranslations();
  const value = props.scale ?? 1;
  return (
    <div className="flex flex-col gap-1.5 px-1 pt-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">
          {t("THEME.CHAT_FONT_SIZE")}
        </span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {Math.round(value * 100)}%
        </span>
      </div>
      <Slider
        aria-label={t("THEME.CHAT_FONT_SIZE")}
        min={FONT_SCALE_MIN}
        max={FONT_SCALE_MAX}
        step={FONT_SCALE_STEP}
        value={value}
        onValueChange={(v) =>
          props.onChange(Array.isArray(v) ? (v[0] ?? 1) : v)
        }
      />
    </div>
  );
}

const MARKDOWN_FIELDS = [
  ["normal", "THEME.MD_NORMAL"],
  ["italic", "THEME.MD_ITALIC"],
  ["bold", "THEME.MD_BOLD"],
  ["italicBold", "THEME.MD_ITALIC_BOLD"],
  ["singleQuote", "THEME.MD_SINGLE_QUOTE"],
  ["doubleQuote", "THEME.MD_DOUBLE_QUOTE"],
] as const;

export function ChatTextSection(props: {
  markdown: ChatMarkdownColors | undefined;
  onChange: (patch: Partial<ChatMarkdownColors>) => void;
}) {
  const t = useTranslations();
  return (
    <>
      <div className="text-muted-foreground px-1 pt-1 text-xs">
        {t("THEME.CHAT_TEXT")}
      </div>
      {MARKDOWN_FIELDS.map(([key, labelKey]) => (
        <ColorField
          key={key}
          label={t(labelKey)}
          value={props.markdown?.[key]}
          onChange={(v) => props.onChange({ [key]: v })}
        />
      ))}
    </>
  );
}

const SURFACE_FIELDS = [
  ["background", "THEME.COLOR_BACKGROUND"],
  ["foreground", "THEME.COLOR_FOREGROUND"],
  ["card", "THEME.COLOR_CARD"],
  ["primary", "THEME.COLOR_PRIMARY"],
  ["accent", "THEME.COLOR_ACCENT"],
  ["sidebar", "THEME.COLOR_SIDEBAR"],
  ["border", "THEME.COLOR_BORDER"],
] as const;

export function SurfaceColorsSection(props: {
  // Surface colors for the currently-edited scheme (light or dark).
  surface: SurfaceColors | undefined;
  mode: "light" | "dark";
  onModeChange: (mode: "light" | "dark") => void;
  onChange: (patch: Partial<SurfaceColors>) => void;
}) {
  const t = useTranslations();
  return (
    <>
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <span className="text-muted-foreground text-xs">
          {t("THEME.SURFACE_COLORS")}
        </span>
        {/* RisuAI parity: custom colors are per-scheme; this picks which one the
            fields below edit. */}
        <Tabs
          value={props.mode}
          onValueChange={(v) => props.onModeChange(v as "light" | "dark")}
        >
          <TabsList className="h-7">
            <TabsTrigger value="light" className="text-xs">
              {t("THEME.MODE_LIGHT")}
            </TabsTrigger>
            <TabsTrigger value="dark" className="text-xs">
              {t("THEME.MODE_DARK")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {SURFACE_FIELDS.map(([key, labelKey]) => (
        <ColorField
          key={key}
          label={t(labelKey)}
          value={props.surface?.[key]}
          onChange={(v) => props.onChange({ [key]: v })}
        />
      ))}
    </>
  );
}
