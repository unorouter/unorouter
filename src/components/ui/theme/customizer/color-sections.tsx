"use client";

import { ColorField } from "@/components/ui/theme/customizer/color-field";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AVATAR_SIZES } from "@/components/ui/theme/theme-store";
import type {
  ChatMarkdownColors,
  SurfaceColors,
  SurfaceScope,
} from "@/components/ui/theme/theme-store";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";

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

const AVATAR_SCALE_DEFAULT = 1;

const ASSET_WIDTH_MIN = 4;
const ASSET_WIDTH_MAX = 40;
const ASSET_WIDTH_STEP = 1;
const ASSET_WIDTH_DEFAULT = 20;

export function AssetImageWidthSection(props: {
  width: number | undefined;
  onChange: (rem: number) => void;
}) {
  const t = useTranslations();
  const value = props.width ?? ASSET_WIDTH_DEFAULT;
  return (
    <div className="flex flex-col gap-1.5 px-1 pt-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">
          {t("THEME.ASSET_IMAGE_WIDTH")}
        </span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {value} rem
        </span>
      </div>
      <Slider
        aria-label={t("THEME.ASSET_IMAGE_WIDTH")}
        min={ASSET_WIDTH_MIN}
        max={ASSET_WIDTH_MAX}
        step={ASSET_WIDTH_STEP}
        value={value}
        onValueChange={(v) =>
          props.onChange(Array.isArray(v) ? (v[0] ?? ASSET_WIDTH_DEFAULT) : v)
        }
      />
    </div>
  );
}

export function AvatarScaleSection(props: {
  scale: number | undefined;
  onChange: (scale: number) => void;
}) {
  const t = useTranslations();
  const value = props.scale ?? AVATAR_SCALE_DEFAULT;
  return (
    <div className="flex flex-col gap-1.5 px-1 pt-1">
      <span className="text-muted-foreground text-xs">
        {t("THEME.AVATAR_SCALE")}
      </span>
      <div className="flex gap-2">
        {AVATAR_SIZES.map((size) => (
          <Button
            key={size.scale}
            type="button"
            size="sm"
            className="flex-1"
            variant={value === size.scale ? "default" : "outline"}
            onClick={() => props.onChange(size.scale)}
          >
            {t(size.labelKey)}
          </Button>
        ))}
      </div>
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
  ["muted", "THEME.COLOR_MUTED"],
  ["sidebar", "THEME.COLOR_SIDEBAR"],
  ["border", "THEME.COLOR_BORDER"],
] as const;

export function SurfaceColorsSection(props: {
  surface: SurfaceColors | undefined;
  mode: "light" | "dark";
  scope: SurfaceScope;
  onModeChange: (mode: "light" | "dark") => void;
  onScopeChange: (scope: SurfaceScope) => void;
  onChange: (patch: Partial<SurfaceColors>) => void;
  onCopyToOtherMode: () => void;
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
        <Tabs value={props.mode} onValueChange={(v) => props.onModeChange(v)}>
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
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-muted-foreground text-xs">
          {t("THEME.SURFACE_SCOPE")}
        </span>
        <Tabs value={props.scope} onValueChange={(v) => props.onScopeChange(v)}>
          <TabsList className="h-7">
            <TabsTrigger value="app" className="text-xs">
              {t("THEME.SCOPE_APP")}
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs">
              {t("THEME.SCOPE_CHAT")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex justify-end px-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={props.onCopyToOtherMode}
          disabled={!props.surface}
        >
          <Icon name="copy" className="mr-1.5 size-3.5" />
          {t(
            props.mode === "light"
              ? "THEME.COPY_TO_DARK"
              : "THEME.COPY_TO_LIGHT",
          )}
        </Button>
      </div>
      {props.scope === "chat" && !props.surface ? (
        <p className="text-muted-foreground px-1 text-[11px]">
          {t("THEME.SCOPE_CHAT_INHERITS")}
        </p>
      ) : null}
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
