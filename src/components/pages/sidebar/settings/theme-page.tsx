"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { INITIAL_USER_THEME, userThemeAtom } from "@/store/theme-store";
import type { UserTheme } from "@/store/theme-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { LuDownload, LuRefreshCcw, LuUpload } from "react-icons/lu";
import { toast } from "sonner";
import { ThemeColorPicker } from "./theme-color-picker";
import { ThemeFontPicker } from "./theme-font-picker";
import { ThemeSpacingSlider } from "./theme-spacing-slider";

/** Project defaults shown as fallbacks in the picker (mirrors globals.css). */
const DEFAULTS = {
  colors: {
    primary: "#18181b",
    accent: "#f4f4f5",
    background: "#ffffff",
    foreground: "#09090b",
    card: "#ffffff",
    muted: "#f4f4f5",
    border: "#e4e4e7",
    ring: "#a1a1aa",
    destructive: "#ef4444",
    success: "#10b981",
    warning: "#f59e0b",
    info: "#3b82f6",
  },
  fontSize: 16,
  lineHeight: 1.5,
  letterSpacing: 0,
  radius: 0.5,
};

export function ThemePage() {
  const t = useTranslations();
  const [theme, setTheme] = useAtom(userThemeAtom);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const setColor = (key: keyof NonNullable<UserTheme["colors"]>) =>
    (next: string | undefined) => {
      const colors = { ...(theme.colors ?? {}) };
      if (next == null) delete colors[key];
      else colors[key] = next;
      setTheme({
        ...theme,
        colors: Object.keys(colors).length ? colors : undefined,
      });
    };

  const setFont = (key: keyof NonNullable<UserTheme["fonts"]>) =>
    (next: string | undefined) => {
      const fonts = { ...(theme.fonts ?? {}) };
      if (next == null) delete fonts[key];
      else fonts[key] = next;
      setTheme({
        ...theme,
        fonts: Object.keys(fonts).length ? fonts : undefined,
      });
    };

  const setScalar =
    (key: "fontSize" | "lineHeight" | "letterSpacing" | "radius") =>
    (next: number | undefined) => {
      const out = { ...theme };
      if (next == null) delete out[key];
      else out[key] = next;
      setTheme(out);
    };

  const resetAll = () => {
    setTheme(INITIAL_USER_THEME);
    toast.success(t("THEME.RESET_DONE"));
  };

  const exportTheme = () => {
    const blob = new Blob([JSON.stringify(theme, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "unorouter-theme.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as UserTheme;
      if (typeof parsed !== "object" || parsed === null) throw new Error();
      setTheme(parsed);
      toast.success(t("THEME.IMPORT_DONE"));
    } catch {
      toast.error(t("THEME.IMPORT_FAILED"));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">
            {t("THEME.TITLE")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("THEME.SUBTITLE")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <LuUpload className="mr-2 size-3.5" />
            {t("THEME.IMPORT")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importTheme(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportTheme}
          >
            <LuDownload className="mr-2 size-3.5" />
            {t("THEME.EXPORT")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetAll}
            disabled={Object.keys(theme).length === 0}
          >
            <LuRefreshCcw className="mr-2 size-3.5" />
            {t("THEME.RESET_ALL")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="colors">
        <TabsList>
          <TabsTrigger value="colors">{t("THEME.TAB_COLORS")}</TabsTrigger>
          <TabsTrigger value="fonts">{t("THEME.TAB_FONTS")}</TabsTrigger>
          <TabsTrigger value="spacing">{t("THEME.TAB_SPACING")}</TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="mt-4">
          <Card className="flex flex-col gap-4 p-5">
            <ThemeColorPicker
              label={t("THEME.COLOR_PRIMARY")}
              value={theme.colors?.primary}
              fallback={DEFAULTS.colors.primary}
              onChange={setColor("primary")}
            />
            <ThemeColorPicker
              label={t("THEME.COLOR_ACCENT")}
              value={theme.colors?.accent}
              fallback={DEFAULTS.colors.accent}
              onChange={setColor("accent")}
            />
            <Separator />
            <ThemeColorPicker
              label={t("THEME.COLOR_BACKGROUND")}
              value={theme.colors?.background}
              fallback={DEFAULTS.colors.background}
              onChange={setColor("background")}
            />
            <ThemeColorPicker
              label={t("THEME.COLOR_FOREGROUND")}
              value={theme.colors?.foreground}
              fallback={DEFAULTS.colors.foreground}
              onChange={setColor("foreground")}
            />
            <ThemeColorPicker
              label={t("THEME.COLOR_CARD")}
              value={theme.colors?.card}
              fallback={DEFAULTS.colors.card}
              onChange={setColor("card")}
            />
            <ThemeColorPicker
              label={t("THEME.COLOR_MUTED")}
              value={theme.colors?.muted}
              fallback={DEFAULTS.colors.muted}
              onChange={setColor("muted")}
            />
            <ThemeColorPicker
              label={t("THEME.COLOR_BORDER")}
              value={theme.colors?.border}
              fallback={DEFAULTS.colors.border}
              onChange={setColor("border")}
            />
            <ThemeColorPicker
              label={t("THEME.COLOR_RING")}
              value={theme.colors?.ring}
              fallback={DEFAULTS.colors.ring}
              onChange={setColor("ring")}
            />
            <Separator />
            <ThemeColorPicker
              label={t("THEME.COLOR_DESTRUCTIVE")}
              value={theme.colors?.destructive}
              fallback={DEFAULTS.colors.destructive}
              onChange={setColor("destructive")}
            />
            <ThemeColorPicker
              label={t("THEME.COLOR_SUCCESS")}
              value={theme.colors?.success}
              fallback={DEFAULTS.colors.success}
              onChange={setColor("success")}
            />
            <ThemeColorPicker
              label={t("THEME.COLOR_WARNING")}
              value={theme.colors?.warning}
              fallback={DEFAULTS.colors.warning}
              onChange={setColor("warning")}
            />
            <ThemeColorPicker
              label={t("THEME.COLOR_INFO")}
              value={theme.colors?.info}
              fallback={DEFAULTS.colors.info}
              onChange={setColor("info")}
            />
          </Card>
        </TabsContent>

        <TabsContent value="fonts" className="mt-4">
          <Card className="flex flex-col gap-4 p-5">
            <ThemeFontPicker
              label={t("THEME.FONT_SANS")}
              kind="sans"
              value={theme.fonts?.sans}
              onChange={setFont("sans")}
            />
            <ThemeFontPicker
              label={t("THEME.FONT_DISPLAY")}
              kind="display"
              value={theme.fonts?.display}
              onChange={setFont("display")}
            />
            <ThemeFontPicker
              label={t("THEME.FONT_MONO")}
              kind="mono"
              value={theme.fonts?.mono}
              onChange={setFont("mono")}
            />
          </Card>
        </TabsContent>

        <TabsContent value="spacing" className="mt-4">
          <Card className="flex flex-col gap-5 p-5">
            <ThemeSpacingSlider
              label={t("THEME.FONT_SIZE")}
              value={theme.fontSize}
              fallback={DEFAULTS.fontSize}
              min={12}
              max={24}
              step={1}
              unit="px"
              onChange={setScalar("fontSize")}
            />
            <ThemeSpacingSlider
              label={t("THEME.LINE_HEIGHT")}
              value={theme.lineHeight}
              fallback={DEFAULTS.lineHeight}
              min={1}
              max={2}
              step={0.05}
              onChange={setScalar("lineHeight")}
            />
            <ThemeSpacingSlider
              label={t("THEME.LETTER_SPACING")}
              value={theme.letterSpacing}
              fallback={DEFAULTS.letterSpacing}
              min={-0.05}
              max={0.15}
              step={0.005}
              unit="em"
              onChange={setScalar("letterSpacing")}
            />
            <ThemeSpacingSlider
              label={t("THEME.RADIUS")}
              value={theme.radius}
              fallback={DEFAULTS.radius}
              min={0}
              max={2}
              step={0.05}
              unit="rem"
              onChange={setScalar("radius")}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
