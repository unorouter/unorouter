"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SyncBadge } from "@/components/elements/badge/sync-badge";
import { useAuthQuery } from "@/hooks/auth-hook";
import { upsertLocalTheme } from "@/lib/db/client/data/writes";
import { enqueuePending } from "@/lib/db/client/sync/pending-sync";
import { useSyncStateForRow } from "@/hooks/sync-hook";
import {
  ALL_BASE_COLORS,
  ALL_THEMES,
  ICON_LIBRARIES,
  MENU_ACCENTS,
  MENUS,
  RADII,
} from "@/components/ui/theme/shadcn-themes";
import { STYLES } from "@/components/ui/theme/shadcn-styles";
import { FONT_OPTIONS } from "@/components/ui/theme/theme-fonts";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { downloadJson } from "@/lib/utils/client";
import { INITIAL_USER_THEME, userThemeAtom } from "@/components/ui/theme/theme-store";
import type { UserTheme } from "@/components/ui/theme/theme-store";
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

function StyleGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="3" />
      <rect x="14" y="14" width="7" height="7" rx="4" />
    </svg>
  );
}

function MenuGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function AccentGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}

export function ThemeCustomizerBody() {
  const t = useTranslations();
  const [theme, setThemeRaw] = useAtom(userThemeAtom);
  const auth = useAuthQuery();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const themeSyncState = useSyncStateForRow(
    "theme",
    auth.data ? String(auth.data.id) : "",
  );

  const setTheme = (next: UserTheme) => {
    setThemeRaw(next);
    const userId = auth.data?.id ?? 0;
    const syncExpiresAt = themeSyncState.syncExpiresAt;
    void upsertLocalTheme(
      userId,
      next,
      syncExpiresAt as Date | null | undefined,
    ).catch(() => {});
    if (userId > 0 && syncExpiresAt != null) {
      void (async () => {
        try {
          handleElysia(
            await rpc.api.ai
              .sync({ kind: "theme" })({ id: String(userId) })
              .post({ payload: { themeJson: next }, keepExpiry: true }),
          );
        } catch (err) {
          await enqueuePending(userId, "theme", String(userId), "patch", err);
        }
      })();
    }
  };

  const resetAll = () => {
    setTheme(INITIAL_USER_THEME);
    toast.success(t("THEME.RESET_DONE"));
  };

  const shuffle = () => {
    const style = STYLES[Math.floor(Math.random() * STYLES.length)];
    const baseColor =
      ALL_BASE_COLORS[Math.floor(Math.random() * ALL_BASE_COLORS.length)];
    const accent = ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)];
    const chart = ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)];
    const radius = RADII[Math.floor(Math.random() * RADII.length)];
    const sansFonts = FONT_OPTIONS.filter((f) => f.kinds.includes("sans"));
    const displayFonts = FONT_OPTIONS.filter((f) =>
      f.kinds.includes("display"),
    );
    const body = sansFonts[Math.floor(Math.random() * sansFonts.length)];
    const heading =
      Math.random() < 0.5
        ? "inherit"
        : displayFonts[Math.floor(Math.random() * displayFonts.length)].id;
    const menu = MENUS[Math.floor(Math.random() * MENUS.length)];
    const accentMode =
      MENU_ACCENTS[Math.floor(Math.random() * MENU_ACCENTS.length)];
    const iconLib =
      ICON_LIBRARIES[Math.floor(Math.random() * ICON_LIBRARIES.length)];
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
    downloadJson(theme, "unorouter-theme.json");
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
