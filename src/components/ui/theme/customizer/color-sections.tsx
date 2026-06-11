"use client";

import { ColorField } from "@/components/ui/theme/customizer/color-field";
import type {
  ChatMarkdownColors,
  SurfaceColors,
} from "@/components/ui/theme/theme-store";
import { useTranslations } from "next-intl";

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
  surface: SurfaceColors | undefined;
  onChange: (patch: Partial<SurfaceColors>) => void;
}) {
  const t = useTranslations();
  return (
    <>
      <div className="text-muted-foreground px-1 pt-1 text-xs">
        {t("THEME.SURFACE_COLORS")}
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
