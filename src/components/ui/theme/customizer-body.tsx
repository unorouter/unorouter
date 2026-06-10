"use client";

import { pick } from "@/lib/utils/base";

import { SyncBadge } from "@/components/elements/badge/sync-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { BackgroundImageSection } from "@/components/ui/theme/customizer/background-image-section";
import {
  ChatTextSection,
  SurfaceColorsSection,
} from "@/components/ui/theme/customizer/color-sections";
import {
  AccentGlyph,
  MenuGlyph,
  StyleGlyph,
} from "@/components/ui/theme/customizer/glyphs";
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
  themeBackgroundAtom,
  userThemeAtom,
} from "@/components/ui/theme/theme-store";
import type {
  BackgroundSettings,
  ChatMarkdownColors,
  SurfaceColors,
  UserTheme,
} from "@/components/ui/theme/theme-store";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useSyncStateForRow } from "@/hooks/ai/sync-hook";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { upsertLocalTheme } from "@/lib/db/client/data/theme";
import { mirrorSyncedRow } from "@/hooks/ai/rp/shared";
import { downloadJson } from "@/lib/utils/client";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { toast } from "sonner";
import { FieldGroup, FieldSeparator } from "./field";
import { ColorSwatch, FontGlyph, Picker, RadiusGlyph } from "./picker";

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

export function ThemeCustomizerBody() {
  const t = useTranslations();
  const [theme, setThemeRaw] = useAtom(userThemeAtom);
  const [backgroundImage, setBackgroundImage] = useAtom(themeBackgroundAtom);
  const auth = useAuthQuery();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const themeSyncState = useSyncStateForRow(
    "theme",
    auth.data ? String(auth.data.id) : "",
  );

  const setTheme = (next: UserTheme) => {
    setThemeRaw(next);
    const userId = auth.data?.id ?? GUEST_USER_ID;
    const syncExpiresAt = themeSyncState.syncExpiresAt;
    void upsertLocalTheme(
      userId,
      next,
      syncExpiresAt as Date | null | undefined,
    ).catch(() => {});
    if (userId > 0 && syncExpiresAt != null) {
      // Outbox + debounced drain: slider drags coalesce into one push.
      void mirrorSyncedRow(userId, "theme", String(userId));
    }
  };

  const setMarkdown = (patch: Partial<ChatMarkdownColors>) => {
    const nextMd: ChatMarkdownColors = { ...(theme.markdown ?? {}), ...patch };
    for (const key of Object.keys(nextMd) as Array<keyof ChatMarkdownColors>) {
      if (nextMd[key] === undefined) delete nextMd[key];
    }
    setTheme({ ...theme, markdown: nextMd });
  };

  const setSurface = (patch: Partial<SurfaceColors>) => {
    const next: SurfaceColors = { ...(theme.surface ?? {}), ...patch };
    for (const key of Object.keys(next) as Array<keyof SurfaceColors>) {
      if (next[key] === undefined) delete next[key];
    }
    setTheme({ ...theme, surface: next });
  };

  const setBackground = (patch: Partial<BackgroundSettings>) => {
    setTheme({
      ...theme,
      background: { ...(theme.background ?? {}), ...patch },
    });
  };

  const resetAll = () => {
    setTheme(INITIAL_USER_THEME);
    setBackgroundImage(null);
    toast.success(t("THEME.RESET_DONE"));
  };

  const shuffle = () => {
    const style = pick(STYLES);
    const baseColor =
      pick(ALL_BASE_COLORS);
    const accent = pick(ALL_THEMES);
    const chart = pick(ALL_THEMES);
    const radius = pick(RADII);
    const sansFonts = FONT_OPTIONS.filter((f) => f.kinds.includes("sans"));
    const displayFonts = FONT_OPTIONS.filter((f) =>
      f.kinds.includes("display"),
    );
    const body = pick(sansFonts);
    const heading =
      Math.random() < 0.5
        ? "inherit"
        : pick(displayFonts).id;
    const menu = pick(MENUS);
    const accentMode =
      pick(MENU_ACCENTS);
    const iconLib =
      pick(ICON_LIBRARIES);
    setTheme({
      ...theme,
      style: style.name,
      baseColor: baseColor.name,
      theme: accent.name,
      chartColor: chart.name,
      radius: radius.name,
      fontBody: body.id,
      fontHeading: heading,
      menu: menu.name,
      menuAccent: accentMode.name,
      iconLibrary: iconLib.name,
    });
  };

  const exportTheme = () => {
    downloadJson(theme, `${env.appName.toLowerCase()}-theme.json`);
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

  const fontBodyOptions = [
    { value: "inherit", label: t("THEME.FONT_DEFAULT") },
    ...FONT_OPTIONS.filter((f) => f.kinds.includes("sans")).map((f) => ({
      value: f.id,
      label: f.label,
    })),
  ];
  const fontHeadingOptions = [
    { value: "inherit", label: t("THEME.FONT_HEADING_INHERIT") },
    ...FONT_OPTIONS.filter((f) => f.kinds.includes("display")).map((f) => ({
      value: f.id,
      label: f.label,
    })),
  ];

  const cur = {
    style: theme.style ?? INITIAL_USER_THEME.style!,
    base: theme.baseColor ?? INITIAL_USER_THEME.baseColor!,
    theme: theme.theme ?? INITIAL_USER_THEME.theme!,
    chart: theme.chartColor ?? INITIAL_USER_THEME.chartColor!,
    body: theme.fontBody ?? INITIAL_USER_THEME.fontBody!,
    heading: theme.fontHeading ?? INITIAL_USER_THEME.fontHeading!,
    icon: theme.iconLibrary ?? INITIAL_USER_THEME.iconLibrary!,
    radius: theme.radius ?? INITIAL_USER_THEME.radius!,
    menu: theme.menu ?? INITIAL_USER_THEME.menu!,
    menuAccent: theme.menuAccent ?? INITIAL_USER_THEME.menuAccent!,
  };

  return (
    <Card className="bg-card/95 dark relative isolate flex h-full max-h-full min-h-0 flex-col gap-0 rounded-2xl shadow-xl backdrop-blur-xl">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b py-4">
        <CardTitle className="shrink-0">{t("THEME.TITLE")}</CardTitle>
        {auth.data && (
          <SyncBadge kind="theme" id={String(auth.data.id)} payload={theme} />
        )}
      </CardHeader>
      <CardContent className="no-scrollbar min-h-0 flex-1 overflow-y-auto py-4">
        <FieldGroup>
          <Picker
            label={t("THEME.STYLE")}
            value={cur.style}
            valueLabel={STYLES.find((s) => s.name === cur.style)?.label ?? ""}
            options={STYLES.map((s) => ({ value: s.name, label: s.label }))}
            rightAdornment={<StyleGlyph />}
            onValueChange={(v) => setTheme({ ...theme, style: v })}
          />
          <FieldSeparator />
          <Picker
            label={t("THEME.BASE_COLOR")}
            value={cur.base}
            valueLabel={
              ALL_BASE_COLORS.find((b) => b.name === cur.base)?.title ?? ""
            }
            options={ALL_BASE_COLORS.map((b) => ({
              value: b.name,
              label: b.title,
              swatch: baseColorChipColor(b.name),
            }))}
            rightAdornment={
              <ColorSwatch value={baseColorChipColor(cur.base)} />
            }
            onValueChange={(v) => setTheme({ ...theme, baseColor: v })}
          />
          <Picker
            label={t("THEME.THEME")}
            value={cur.theme}
            valueLabel={
              ALL_THEMES.find((x) => x.name === cur.theme)?.title ?? ""
            }
            options={ALL_THEMES.map((x) => ({
              value: x.name,
              label: x.title,
              swatch: themeChipColor(x.name),
            }))}
            rightAdornment={<ColorSwatch value={themeChipColor(cur.theme)} />}
            onValueChange={(v) => setTheme({ ...theme, theme: v })}
          />
          <Picker
            label={t("THEME.CHART_COLOR")}
            value={cur.chart}
            valueLabel={
              ALL_THEMES.find((x) => x.name === cur.chart)?.title ?? ""
            }
            options={ALL_THEMES.map((x) => ({
              value: x.name,
              label: x.title,
              swatch: themeChipColor(x.name),
            }))}
            rightAdornment={<ColorSwatch value={themeChipColor(cur.chart)} />}
            onValueChange={(v) => setTheme({ ...theme, chartColor: v })}
          />
          <FieldSeparator />
          <Picker
            label={t("THEME.HEADING_FONT")}
            value={cur.heading}
            valueLabel={
              cur.heading === "inherit"
                ? t("THEME.FONT_HEADING_INHERIT")
                : (FONT_OPTIONS.find((f) => f.id === cur.heading)?.label ??
                  t("THEME.FONT_DEFAULT"))
            }
            options={fontHeadingOptions}
            rightAdornment={<FontGlyph />}
            onValueChange={(v) => setTheme({ ...theme, fontHeading: v })}
          />
          <Picker
            label={t("THEME.BODY_FONT")}
            value={cur.body}
            valueLabel={
              cur.body === "inherit"
                ? t("THEME.FONT_DEFAULT")
                : (FONT_OPTIONS.find((f) => f.id === cur.body)?.label ??
                  t("THEME.FONT_DEFAULT"))
            }
            options={fontBodyOptions}
            rightAdornment={<FontGlyph />}
            onValueChange={(v) => setTheme({ ...theme, fontBody: v })}
          />
          <FieldSeparator />
          <Picker
            label={t("THEME.ICON_LIBRARY")}
            value={cur.icon}
            valueLabel={
              ICON_LIBRARIES.find((i) => i.name === cur.icon)?.label ?? "Lucide"
            }
            options={ICON_LIBRARIES.map((i) => ({
              value: i.name,
              label: i.label,
            }))}
            rightAdornment={<StyleGlyph />}
            onValueChange={(v) => setTheme({ ...theme, iconLibrary: v })}
          />
          <Picker
            label={t("THEME.RADIUS")}
            value={cur.radius}
            valueLabel={
              RADII.find((r) => r.name === cur.radius)?.label ?? "Default"
            }
            options={RADII.map((r) => ({ value: r.name, label: r.label }))}
            rightAdornment={
              <RadiusGlyph
                radius={
                  parseFloat(
                    RADII.find((r) => r.name === cur.radius)?.value || "0.625",
                  ) || 0.625
                }
              />
            }
            onValueChange={(v) => setTheme({ ...theme, radius: v })}
          />
          <FieldSeparator />
          <Picker
            label={t("THEME.MENU")}
            value={cur.menu}
            valueLabel={MENUS.find((m) => m.name === cur.menu)?.label ?? ""}
            options={MENUS.map((m) => ({ value: m.name, label: m.label }))}
            rightAdornment={<MenuGlyph />}
            onValueChange={(v) => setTheme({ ...theme, menu: v })}
          />
          <Picker
            label={t("THEME.MENU_ACCENT")}
            value={cur.menuAccent}
            valueLabel={
              MENU_ACCENTS.find((m) => m.name === cur.menuAccent)?.label ?? ""
            }
            options={MENU_ACCENTS.map((m) => ({
              value: m.name,
              label: m.label,
            }))}
            rightAdornment={<AccentGlyph />}
            onValueChange={(v) => setTheme({ ...theme, menuAccent: v })}
          />
          <FieldSeparator />
          <ChatTextSection markdown={theme.markdown} onChange={setMarkdown} />
          <FieldSeparator />
          <SurfaceColorsSection surface={theme.surface} onChange={setSurface} />
          <FieldSeparator />
          <BackgroundImageSection
            image={backgroundImage}
            setImage={setBackgroundImage}
            background={theme.background}
            onChange={setBackground}
          />
        </FieldGroup>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t pt-4 *:w-full">
        <Button type="button" variant="outline" size="sm" onClick={shuffle}>
          <Icon name="shuffle" className="mr-1.5 size-3.5" />
          {t("THEME.SHUFFLE")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetAll}
          disabled={
            JSON.stringify(theme) === JSON.stringify(INITIAL_USER_THEME)
          }
        >
          <Icon name="refresh-ccw" className="mr-1.5 size-3.5" />
          {t("THEME.RESET_ALL")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon name="upload" className="mr-1.5 size-3.5" />
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
        <Button type="button" variant="outline" size="sm" onClick={exportTheme}>
          <Icon name="download" className="mr-1.5 size-3.5" />
          {t("THEME.EXPORT")}
        </Button>
      </CardFooter>
    </Card>
  );
}
