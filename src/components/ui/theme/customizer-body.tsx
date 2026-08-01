"use client";

import { pick } from "@/lib/utils/base";

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
import { RegistryPickers } from "@/components/ui/theme/customizer/registry-pickers";
import {
  AssetImageWidthSection,
  ChatTextSection,
  FontSizeSection,
  SurfaceColorsSection,
} from "@/components/ui/theme/customizer/color-sections";
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
  normalizeSurface,
  themeBackgroundAtom,
  userThemeAtom,
  type BackgroundSettings,
  type ChatMarkdownColors,
  type SurfaceColors,
  type UserTheme,
} from "@/components/ui/theme/theme-store";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { env } from "@/lib/config/env";
import { upsertLocalTheme } from "@/lib/db/client/data/theme";
import { downloadJson } from "@/lib/utils/client";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { toast } from "sonner";
import { FieldGroup, FieldSeparator } from "./field";

export function ThemeCustomizerBody() {
  const t = useTranslations();
  const [theme, setThemeRaw] = useAtom(userThemeAtom);
  const [backgroundImage, setBackgroundImage] = useAtom(themeBackgroundAtom);
  const userId = useLocalUserId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const setTheme = (next: UserTheme) => {
    setThemeRaw(next);
    void upsertLocalTheme(userId, next).catch(() => {});
  };

  const setMarkdown = (patch: Partial<ChatMarkdownColors>) => {
    const nextMd: ChatMarkdownColors = { ...(theme.markdown ?? {}), ...patch };
    for (const key of Object.keys(nextMd) as Array<keyof ChatMarkdownColors>) {
      if (nextMd[key] === undefined) delete nextMd[key];
    }
    setTheme({ ...theme, markdown: nextMd });
  };

  const surfaceMode = theme.surfaceMode ?? "dark";
  const surfacePalette = normalizeSurface(theme.surface);

  const setSurface = (patch: Partial<SurfaceColors>) => {
    const next: SurfaceColors = {
      ...(surfacePalette[surfaceMode] ?? {}),
      ...patch,
    };
    for (const key of Object.keys(next) as Array<keyof SurfaceColors>) {
      if (next[key] === undefined) delete next[key];
    }
    setTheme({
      ...theme,
      surface: { ...surfacePalette, [surfaceMode]: next },
    });
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
    const baseColor = pick(ALL_BASE_COLORS);
    const accent = pick(ALL_THEMES);
    const chart = pick(ALL_THEMES);
    const radius = pick(RADII);
    const sansFonts = FONT_OPTIONS.filter((f) => f.kinds.includes("sans"));
    const displayFonts = FONT_OPTIONS.filter((f) =>
      f.kinds.includes("display"),
    );
    const body = pick(sansFonts);
    const heading = Math.random() < 0.5 ? "inherit" : pick(displayFonts).id;
    const menu = pick(MENUS);
    const accentMode = pick(MENU_ACCENTS);
    const iconLib = pick(ICON_LIBRARIES);
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

  return (
    <Card className="bg-card/95 relative isolate flex h-full max-h-full min-h-0 flex-col gap-0 rounded-2xl shadow-xl backdrop-blur-xl">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b py-4">
        <CardTitle className="shrink-0">{t("THEME.TITLE")}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto py-4">
        <FieldGroup>
          <RegistryPickers theme={theme} setTheme={setTheme} />
          <FieldSeparator />
          <ChatTextSection markdown={theme.markdown} onChange={setMarkdown} />
          <FontSizeSection
            scale={theme.chatFontScale}
            onChange={(chatFontScale) => setTheme({ ...theme, chatFontScale })}
          />
          <AssetImageWidthSection
            width={theme.assetImageMaxWidth}
            onChange={(assetImageMaxWidth) =>
              setTheme({ ...theme, assetImageMaxWidth })
            }
          />
          <FieldSeparator />
          <SurfaceColorsSection
            surface={surfacePalette[surfaceMode]}
            mode={surfaceMode}
            onModeChange={(m) => setTheme({ ...theme, surfaceMode: m })}
            onChange={setSurface}
          />
          <FieldSeparator />
          <BackgroundImageSection
            image={backgroundImage}
            setImage={setBackgroundImage}
            background={theme.background}
            onChange={setBackground}
          />
        </FieldGroup>
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-2 border-t pt-4">
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
