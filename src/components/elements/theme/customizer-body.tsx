"use client";

import { BackgroundImageSection } from "@/components/elements/theme/background-image-section";
import { FieldGroup } from "@/components/elements/theme/field";
import {
  ChartPresetSection,
  PresetsSection,
} from "@/components/elements/theme/presets-section";
import { SavedThemesSection } from "@/components/elements/theme/saved-themes-section";
import { TokenField } from "@/components/elements/theme/token-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useSaveThemeMutation,
  useSavedThemesQuery,
} from "@/hooks/ui/use-saved-themes-hook";
import {
  parseThemeFile,
  useThemeEditor,
  type ThemeBundle,
} from "@/hooks/ui/use-theme-editor-hook";
import { env } from "@/lib/config/env";
import {
  THEME_SCOPES,
  tokensIn,
  type MessageKey,
  type ThemeMode,
  type ThemeScope,
  type TokenGroup,
} from "@/lib/theme/tokens";
import { downloadJson } from "@/lib/utils/client";
import { useTranslations } from "next-intl";
import { useRef, type ReactNode } from "react";
import { toast } from "sonner";

const SCOPE_LABEL: Record<ThemeScope, MessageKey> = {
  app: "THEME.SCOPE_APP",
  chat: "THEME.SCOPE_CHAT",
  image: "THEME.SCOPE_IMAGE",
};

const COLOR_GROUPS: readonly {
  group: TokenGroup;
  labelKey: MessageKey;
  hintKey: MessageKey;
}[] = [
  {
    group: "surface",
    labelKey: "THEME.GROUP.SURFACE",
    hintKey: "THEME.GROUP.SURFACE_HINT",
  },
  {
    group: "text",
    labelKey: "THEME.GROUP.TEXT",
    hintKey: "THEME.GROUP.TEXT_HINT",
  },
  {
    group: "control",
    labelKey: "THEME.GROUP.CONTROL",
    hintKey: "THEME.GROUP.CONTROL_HINT",
  },
  {
    group: "status",
    labelKey: "THEME.GROUP.STATUS",
    hintKey: "THEME.GROUP.STATUS_HINT",
  },
  {
    group: "sidebar",
    labelKey: "THEME.GROUP.SIDEBAR",
    hintKey: "THEME.GROUP.SIDEBAR_HINT",
  },
  {
    group: "prose",
    labelKey: "THEME.CATEGORY.CHAT_TEXT",
    hintKey: "THEME.GROUP.PROSE_HINT",
  },
];

type SectionDef = { id: string; labelKey: MessageKey; appOnly?: boolean };

const SECTIONS: readonly SectionDef[] = [
  { id: "presets", labelKey: "THEME.CATEGORY.PRESETS" },
  { id: "colors", labelKey: "THEME.CATEGORY.COLORS" },
  { id: "typography", labelKey: "THEME.CATEGORY.TYPOGRAPHY" },
  { id: "shape", labelKey: "THEME.CATEGORY.SHAPE" },
  { id: "charts", labelKey: "THEME.CATEGORY.CHARTS" },
  { id: "regions", labelKey: "THEME.CATEGORY.REGIONS" },
  { id: "wallpaper", labelKey: "THEME.CATEGORY.WALLPAPER" },
];

function Section(props: {
  id: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="ring-foreground/10 rounded-lg ring-1">
      <button
        type="button"
        onClick={props.onToggle}
        className="text-foreground flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
      >
        {props.label}
        <Icon
          name="chevron-down"
          className={`size-4 transition-transform ${props.open ? "rotate-180" : ""}`}
        />
      </button>
      {props.open && (
        <div className="flex flex-col gap-2.5 border-t p-2.5">
          {props.children}
        </div>
      )}
    </div>
  );
}

export function ThemeCustomizerBody() {
  const t = useTranslations();
  const editor = useThemeEditor();
  const { scope, mode } = editor;
  const saved = useSavedThemesQuery();
  const saveTheme = useSaveThemeMutation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const setScope = (next: ThemeScope) =>
    editor.setEditor({ ...editor.editor, scope: next });
  const setMode = (next: ThemeMode) =>
    editor.setEditor({ ...editor.editor, mode: next });
  const toggleSection = (id: string) =>
    editor.setEditor({
      ...editor.editor,
      section: editor.editor.section === id ? "" : id,
    });

  const fields = (group: TokenGroup) =>
    tokensIn(group, scope).map((def) => (
      <TokenField key={def.id} def={def} editor={editor} />
    ));

  const exportThemes = () => {
    const themes: ThemeBundle[] = [
      {
        name: t("THEME.SAVED.CURRENT"),
        theme: editor.theme,
        backgroundImages: editor.images,
      },
      ...(saved.data ?? []).map((row) => ({
        name: row.name,
        theme: row.themeJson,
        backgroundImages: row.backgroundImages,
      })),
    ];
    downloadJson({ v: 2, themes }, `${env.appName.toLowerCase()}-themes.json`);
  };

  // Lands in the saved list without touching the working theme; a single
  // import offers Apply right in the toast.
  const importText = async (text: string) => {
    let bundles: ThemeBundle[];
    try {
      bundles = parseThemeFile(text, t("THEME.SAVED.IMPORTED_NAME"));
    } catch {
      toast.error(t("THEME.IMPORT_FAILED"), { position: "top-center" });
      return;
    }
    for (const bundle of bundles) {
      await saveTheme.mutateAsync({
        name: bundle.name,
        themeJson: bundle.theme,
        backgroundImages: bundle.backgroundImages,
      });
    }
    const only = bundles.length === 1 ? bundles[0] : undefined;
    toast.success(t("THEME.SAVED.IMPORTED_COUNT", { count: bundles.length }), {
      position: "top-center",
      action: only
        ? {
            label: t("THEME.SAVED.APPLY"),
            onClick: () => editor.applyBundle(only),
          }
        : undefined,
    });
  };

  const importFile = (file: File) =>
    file
      .text()
      .then(importText, () =>
        toast.error(t("THEME.IMPORT_FAILED"), { position: "top-center" }),
      );

  type FooterAction = {
    labelKey: MessageKey;
    icon: IconName;
    onClick: () => void;
    disabled?: boolean;
  };
  const iconButton = (a: FooterAction) => (
    <Tooltip key={a.labelKey}>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-7"
            aria-label={t(a.labelKey)}
            disabled={a.disabled}
            onClick={a.onClick}
          />
        }
      >
        <Icon name={a.icon} className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{t(a.labelKey)}</TooltipContent>
    </Tooltip>
  );
  const FOOTER_ACTIONS: FooterAction[] = [
    {
      labelKey: "THEME.UNDO",
      icon: "rotate-ccw",
      disabled: !editor.canUndo,
      onClick: () => void editor.undo(),
    },
    {
      labelKey: "THEME.REDO",
      icon: "rotate-cw",
      disabled: !editor.canRedo,
      onClick: editor.redo,
    },
    { labelKey: "THEME.SHUFFLE", icon: "shuffle", onClick: editor.shuffle },
    {
      labelKey: "THEME.RESET_ALL",
      icon: "refresh-ccw",
      disabled: editor.scopeIsDefault,
      onClick: editor.resetScope,
    },
  ];
  const FOOTER_AFTER_IMPORT: FooterAction[] = [
    { labelKey: "THEME.EXPORT", icon: "download", onClick: exportThemes },
  ];

  const colorTabs = (
    <Tabs
      value={mode}
      onValueChange={(v) => setMode(v === "light" ? "light" : "dark")}
    >
      <TabsList className="h-7">
        <TabsTrigger value="light" className="text-xs">
          {t("THEME.LIGHT")}
        </TabsTrigger>
        <TabsTrigger value="dark" className="text-xs">
          {t("THEME.DARK")}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const content: Record<string, ReactNode> = {
    presets: <PresetsSection editor={editor} />,
    colors: (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          {colorTabs}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={editor.copyModeToOther}
          >
            <Icon name="copy" className="mr-1 size-3.5" />
            {t(mode === "light" ? "THEME.COPY_TO_DARK" : "THEME.COPY_TO_LIGHT")}
          </Button>
        </div>
        {COLOR_GROUPS.filter((g) => tokensIn(g.group, scope).length).map(
          (g) => (
            <div key={g.group} className="flex flex-col gap-2.5">
              <div className="px-1 pt-2">
                <div className="text-foreground text-xs font-medium">
                  {t(g.labelKey)}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  {t(g.hintKey)}
                </div>
              </div>
              {fields(g.group)}
            </div>
          ),
        )}
      </>
    ),
    typography: [...fields("typography"), ...fields("icons")],
    shape: fields("shape"),
    charts: (
      <>
        <ChartPresetSection editor={editor} />
        {fields("chart")}
      </>
    ),
    wallpaper: <BackgroundImageSection editor={editor} modeTabs={colorTabs} />,
  };

  return (
    <Card className="bg-overlay relative isolate flex h-full max-h-full min-h-0 flex-col gap-0 rounded-2xl shadow-xl backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between border-b py-4">
        <CardTitle className="shrink-0">{t("THEME.TITLE")}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto py-4">
        <FieldGroup>
          <Section
            id="saved"
            label={t("THEME.CATEGORY.SAVED")}
            open={editor.editor.section === "saved"}
            onToggle={() => toggleSection("saved")}
          >
            <SavedThemesSection editor={editor} />
          </Section>
          <Tabs
            value={scope}
            onValueChange={(v) =>
              setScope(THEME_SCOPES.find((s) => s === v) ?? "app")
            }
          >
            <TabsList className="w-full">
              {THEME_SCOPES.map((s) => (
                <TabsTrigger key={s} value={s} className="text-xs">
                  {t(SCOPE_LABEL[s])}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {scope !== "app" && (
            <p className="text-muted-foreground px-1 text-[11px]">
              {t("THEME.SCOPE_HINT")}
            </p>
          )}
          {SECTIONS.filter((s) => !s.appOnly || scope === "app").map((s) => (
            <Section
              key={s.id}
              id={s.id}
              label={t(s.labelKey)}
              open={editor.editor.section === s.id}
              onToggle={() => toggleSection(s.id)}
            >
              {content[s.id]}
            </Section>
          ))}
        </FieldGroup>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-center gap-1 border-t px-3 pt-3 pb-3">
        {FOOTER_ACTIONS.map(iconButton)}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-7"
                aria-label={t("THEME.IMPORT")}
                onClick={() => fileInputRef.current?.click()}
              />
            }
          >
            <Icon name="upload" className="size-4" />
          </TooltipTrigger>
          <TooltipContent>{t("THEME.IMPORT")}</TooltipContent>
        </Tooltip>
        {FOOTER_AFTER_IMPORT.map(iconButton)}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = "";
          }}
        />
      </CardFooter>
    </Card>
  );
}
