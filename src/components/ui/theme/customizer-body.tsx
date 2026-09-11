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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { BackgroundImageSection } from "@/components/ui/theme/customizer/background-image-section";
import { RegistryPickers } from "@/components/ui/theme/customizer/registry-pickers";
import {
  AssetImageWidthSection,
  AvatarScaleSection,
  ChatTextSection,
  FontSizeSection,
  TextWeightSection,
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
import { env } from "@/lib/config/env";
import {
  countThemeHistory,
  dropThemeEntry,
  pushLocalTheme,
  readPreviousTheme,
} from "@/lib/db/client/data/theme";
import {
  downloadJson,
  scaleDataUrl,
  wallpaperMaxDim,
} from "@/lib/utils/client";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FieldGroup, FieldSeparator } from "./field";

export function ThemeCustomizerBody() {
  const t = useTranslations();
  const [theme, setThemeRaw] = useAtom(userThemeAtom);
  const [backgroundImage, setBackgroundImage] = useAtom(themeBackgroundAtom);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  // Redo is per session: undo drops its DB row on use, so the stepped-over
  // theme only exists here until a new edit makes it unreachable.
  const redoStack = useRef<UserTheme[]>([]);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    void countThemeHistory()
      .then((n) => setCanUndo(n > 1))
      .catch(() => {});
  }, []);

  const setTheme = (next: UserTheme) => {
    redoStack.current = [];
    setCanRedo(false);
    setThemeRaw(next);
    void pushLocalTheme(next)
      .then(() => setCanUndo(true))
      .catch(() => {});
  };

  // Applies WITHOUT pushing history: an undo that recorded itself would bury
  // the entry it just restored and the next press would step nowhere.
  const undo = async () => {
    const previous = await readPreviousTheme().catch(() => null);
    if (!previous) return setCanUndo(false);
    redoStack.current.push(theme);
    setCanRedo(true);
    setThemeRaw(previous.theme);
    await dropThemeEntry(previous.dropId).catch(() => {});
    const remaining = await countThemeHistory().catch(() => 0);
    setCanUndo(remaining > 1);
    toast.success(t("THEME.UNDO_DONE"));
  };

  const redo = () => {
    const next = redoStack.current.pop();
    setCanRedo(redoStack.current.length > 0);
    if (!next) return;
    setThemeRaw(next);
    void pushLocalTheme(next)
      .then(() => setCanUndo(true))
      .catch(() => {});
    toast.success(t("THEME.REDO_DONE"));
  };

  const setMarkdown = (patch: Partial<ChatMarkdownColors>) => {
    const nextMd: ChatMarkdownColors = { ...(theme.markdown ?? {}), ...patch };
    for (const key of Object.keys(nextMd) as Array<keyof ChatMarkdownColors>) {
      if (nextMd[key] === undefined) delete nextMd[key];
    }
    setTheme({ ...theme, markdown: nextMd });
  };

  const surfaceMode = theme.surfaceMode ?? "dark";
  const surfaceScope = theme.surfaceScope ?? "app";
  const surfaceField = surfaceScope === "chat" ? "chatSurface" : "surface";
  const surfacePalette = normalizeSurface(theme[surfaceField]);

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
      [surfaceField]: { ...surfacePalette, [surfaceMode]: next },
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

  // The wallpaper lives in its own storage atom, not in the theme row, so the
  // file carries it as a data URL or an import lands without it.
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const exportTheme = () => {
    downloadJson(
      { ...theme, ...(backgroundImage ? { backgroundImage } : {}) },
      `${env.appName.toLowerCase()}-theme.json`,
    );
  };

  const importTheme = (file: File) =>
    file.text().then(importThemeText, () => {
      toast.error(t("THEME.IMPORT_FAILED"));
    });

  // Pasting exists for devices with no usable file picker (a remote or
  // managed iPhone), which is also where themes need the most debugging.
  const importThemeText = async (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null) throw new Error();
      const { backgroundImage: image, ...rest } = parsed;
      if (typeof image === "string" && image.startsWith("data:image/")) {
        const mime = image.slice(5, image.indexOf(";"));
        setBackgroundImage(await scaleDataUrl(image, wallpaperMaxDim(), mime));
      }
      setTheme(rest);
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
          <RegistryPickers
            theme={theme}
            setTheme={setTheme}
            afterField={{
              fontBody: (
                <TextWeightSection
                  weight={theme.chatFontWeight}
                  onChange={(chatFontWeight) =>
                    setTheme({ ...theme, chatFontWeight })
                  }
                />
              ),
            }}
          />
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
          <AvatarScaleSection
            scale={theme.chatAvatarScale}
            onChange={(chatAvatarScale) =>
              setTheme({ ...theme, chatAvatarScale })
            }
          />
          <FieldSeparator />
          <SurfaceColorsSection
            surface={surfacePalette[surfaceMode]}
            mode={surfaceMode}
            scope={surfaceScope}
            onModeChange={(m) => setTheme({ ...theme, surfaceMode: m })}
            onScopeChange={(s) => setTheme({ ...theme, surfaceScope: s })}
            onChange={setSurface}
            onCopyToOtherMode={() => {
              const other = surfaceMode === "light" ? "dark" : "light";
              setTheme({
                ...theme,
                [surfaceField]: {
                  ...surfacePalette,
                  [other]: { ...(surfacePalette[surfaceMode] ?? {}) },
                },
              });
            }}
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void undo()}
          disabled={!canUndo}
        >
          <Icon name="rotate-ccw" className="mr-1.5 size-3.5" />
          {t("THEME.UNDO")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
        >
          <Icon name="rotate-cw" className="mr-1.5 size-3.5" />
          {t("THEME.REDO")}
        </Button>
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
          accept=".json,application/json"
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
          onClick={() => setPasteOpen(true)}
        >
          <Icon name="clipboard-copy" className="mr-1.5 size-3.5" />
          {t("THEME.IMPORT_PASTE")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={exportTheme}>
          <Icon name="download" className="mr-1.5 size-3.5" />
          {t("THEME.EXPORT")}
        </Button>
      </CardFooter>
      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("THEME.IMPORT_PASTE")}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={t("THEME.IMPORT_PASTE_HINT")}
            rows={8}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button
              type="button"
              size="sm"
              disabled={pasteText.trim().length === 0}
              onClick={() => {
                void importThemeText(pasteText).then(() => {
                  setPasteText("");
                  setPasteOpen(false);
                });
              }}
            >
              {t("THEME.IMPORT_PASTE_APPLY")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
