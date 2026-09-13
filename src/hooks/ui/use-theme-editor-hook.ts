"use client";

import {
  countThemeHistory,
  dropThemeEntry,
  pushLocalTheme,
  readPreviousTheme,
} from "@/lib/db/client/data/theme";
import { resolveVars } from "@/lib/theme/build-css";
import { migrateTheme } from "@/lib/theme/migrate";
import {
  ACCENTS,
  CUSTOM,
  DEFAULT,
  PALETTES,
  RADIUS_CHOICES,
  STYLES,
} from "@/lib/theme/presets";
import { FONT_OPTIONS } from "@/lib/theme/fonts";
import {
  themeBackgroundAtoms,
  themeEditorAtom,
  userThemeAtom,
} from "@/lib/theme/theme-store";
import {
  INITIAL_USER_THEME,
  modeValues,
  readToken,
  writeToken,
  type ModeValues,
  type ThemeImages,
  type ThemePresets,
  type TokenValues,
  type UserTheme,
} from "@/lib/theme/theme-types";
import {
  ICON_LIBRARY_OPTIONS,
  MENU_ACCENT_OPTIONS,
  MENU_OPTIONS,
  THEME_SCOPES,
  type ThemeMode,
  type ThemeScope,
  type TokenDef,
} from "@/lib/theme/tokens";
import { pick } from "@/lib/utils/base";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";

export type ThemeBundle = {
  name: string;
  theme: UserTheme;
  backgroundImages: ThemeImages;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function imagesOf(v: unknown): ThemeImages {
  const out: ThemeImages = {};
  if (!isRecord(v)) return out;
  for (const scope of THEME_SCOPES) {
    const img = v[scope];
    if (typeof img === "string" && img.startsWith("data:image/"))
      out[scope] = img;
  }
  return out;
}

// Accepts the list format, a single v2 theme, and the v1 file shape whose
// wallpaper rode along as `backgroundImage`.
export function parseThemeFile(
  text: string,
  fallbackName: string,
): ThemeBundle[] {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) throw new Error("theme-file");
  if (Array.isArray(parsed.themes)) {
    return parsed.themes.filter(isRecord).map((entry, i) => ({
      name:
        typeof entry.name === "string" && entry.name
          ? entry.name
          : `${fallbackName} ${i + 1}`,
      theme: migrateTheme(entry.theme),
      backgroundImages: imagesOf(entry.backgroundImages),
    }));
  }
  const { backgroundImage, backgroundImages, ...rest } = parsed;
  const images = imagesOf(backgroundImages);
  if (
    typeof backgroundImage === "string" &&
    backgroundImage.startsWith("data:image/")
  ) {
    images.app = backgroundImage;
  }
  return [
    { name: fallbackName, theme: migrateTheme(rest), backgroundImages: images },
  ];
}

export function useThemeEditor() {
  const [theme, setThemeRaw] = useAtom(userThemeAtom);
  const [editor, setEditor] = useAtom(themeEditorAtom);
  const [appImage, setAppImage] = useAtom(themeBackgroundAtoms.app);
  const [chatImage, setChatImage] = useAtom(themeBackgroundAtoms.chat);
  const [imageImage, setImageImage] = useAtom(themeBackgroundAtoms.image);
  const images: ThemeImages = {
    app: appImage ?? undefined,
    chat: chatImage ?? undefined,
    image: imageImage ?? undefined,
  };
  const imageSetters = {
    app: setAppImage,
    chat: setChatImage,
    image: setImageImage,
  };

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
  const undo = async (): Promise<boolean> => {
    const previous = await readPreviousTheme().catch(() => null);
    if (!previous) {
      setCanUndo(false);
      return false;
    }
    redoStack.current.push(theme);
    setCanRedo(true);
    setThemeRaw(previous.theme);
    await dropThemeEntry(previous.dropId).catch(() => {});
    const remaining = await countThemeHistory().catch(() => 0);
    setCanUndo(remaining > 1);
    return true;
  };

  const redo = (): boolean => {
    const next = redoStack.current.pop();
    setCanRedo(redoStack.current.length > 0);
    if (!next) return false;
    setThemeRaw(next);
    void pushLocalTheme(next)
      .then(() => setCanUndo(true))
      .catch(() => {});
    return true;
  };

  const scope = editor.scope;
  const mode = editor.mode;
  // What the app layer renders for this mode, so a scope tab can show what it
  // inherits and a preset-driven colour reads as a real value.
  const effective: TokenValues = resolveVars(theme, "app", mode);

  const read = (def: TokenDef) => readToken(theme, scope, mode, def);
  const write = (def: TokenDef, value: string | number | undefined) =>
    setTheme(writeToken(theme, scope, mode, def, value));
  const inherited = (def: TokenDef): string | number | undefined => {
    if (scope !== "app") {
      const own = readToken(theme, "app", mode, def);
      if (own !== undefined) return own;
    }
    return def.cssVar ? effective[def.cssVar.slice(2)] : undefined;
  };

  // Every per-mode value of the current scope, copied over the other mode.
  const copyModeToOther = () => {
    const values = modeValues(theme, scope);
    const other: ThemeMode = mode === "light" ? "dark" : "light";
    const next: ModeValues = {
      ...values,
      [other]: { ...(values[mode] ?? {}) },
    };
    if (scope === "app") setTheme({ ...theme, global: next });
    else setTheme({ ...theme, scopes: { ...theme.scopes, [scope]: next } });
  };

  const setPreset = (key: keyof ThemePresets, id: string) =>
    setTheme({ ...theme, presets: { ...theme.presets, [key]: id } });

  const setImage = (target: ThemeScope, dataUrl: string | null) =>
    imageSetters[target](dataUrl);

  const applyBundle = (bundle: ThemeBundle) => {
    setTheme(bundle.theme);
    for (const s of THEME_SCOPES)
      imageSetters[s](bundle.backgroundImages[s] ?? null);
  };

  const resetAll = () =>
    applyBundle({ name: "", theme: INITIAL_USER_THEME, backgroundImages: {} });

  const shuffle = () => {
    const sans = pick(FONT_OPTIONS.filter((f) => f.kinds.includes("sans")));
    const display = pick(
      FONT_OPTIONS.filter((f) => f.kinds.includes("display")),
    );
    const all: TokenValues = {
      ...(theme.global.all ?? {}),
      radius: pick(RADIUS_CHOICES),
      "font-sans": sans.id,
      menu: pick(MENU_OPTIONS).value,
      "menu-accent": pick(MENU_ACCENT_OPTIONS).value,
      "icon-library": pick(ICON_LIBRARY_OPTIONS).value,
    };
    if (Math.random() < 0.5) all["font-display"] = display.id;
    else delete all["font-display"];
    setTheme({
      ...theme,
      presets: {
        style: pick(STYLES).id,
        palette: pick([DEFAULT, ...PALETTES.map((p) => p.id)]),
        accent: pick([DEFAULT, ...ACCENTS.map((a) => a.id)]),
        chart: pick([DEFAULT, ...ACCENTS.map((a) => a.id)]),
      },
      global: { ...theme.global, all },
    });
  };

  const isCustom = (key: keyof ThemePresets) => theme.presets[key] === CUSTOM;

  return {
    theme,
    setTheme,
    editor,
    setEditor,
    scope,
    mode,
    images,
    setImage,
    effective,
    read,
    write,
    inherited,
    setPreset,
    isCustom,
    copyModeToOther,
    applyBundle,
    resetAll,
    shuffle,
    undo,
    redo,
    canUndo,
    canRedo,
    isDefault:
      JSON.stringify(theme) === JSON.stringify(INITIAL_USER_THEME) &&
      !images.app &&
      !images.chat &&
      !images.image,
  };
}

export type ThemeEditor = ReturnType<typeof useThemeEditor>;
