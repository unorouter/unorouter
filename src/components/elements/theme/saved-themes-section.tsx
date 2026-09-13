"use client";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  useDeleteSavedThemeMutation,
  useRenameSavedThemeMutation,
  useSaveThemeMutation,
  useSavedThemesQuery,
} from "@/hooks/ui/use-saved-themes-hook";
import type { ThemeEditor } from "@/hooks/ui/use-theme-editor-hook";
import { findAccent, findPalette } from "@/lib/theme/presets";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export function SavedThemesSection(props: { editor: ThemeEditor }) {
  const t = useTranslations();
  const { editor } = props;
  const list = useSavedThemesQuery();
  const save = useSaveThemeMutation();
  const rename = useRenameSavedThemeMutation();
  const remove = useDeleteSavedThemeMutation();
  // Null closed; an id renames that row; "" saves the working copy.
  const [prompt, setPrompt] = useState<{ id: string; name: string } | null>(
    null,
  );

  const suggestedName = () => {
    const parts = [
      findPalette(editor.theme.presets.palette)?.label,
      findAccent(editor.theme.presets.accent)?.label,
    ].filter(Boolean);
    return parts.length ? parts.join(" ") : t("THEME.SAVED.DEFAULT_NAME");
  };

  const commit = () => {
    if (!prompt) return;
    const name = prompt.name.trim();
    if (!name) return;
    if (prompt.id) {
      rename.mutate({ id: prompt.id, name });
    } else {
      save.mutate(
        { name, themeJson: editor.theme, backgroundImages: editor.images },
        {
          onSuccess: () =>
            toast.success(t("THEME.SAVED.SAVED_DONE"), {
              position: "top-center",
            }),
        },
      );
    }
    setPrompt(null);
  };

  return (
    <>
      <p className="text-muted-foreground px-1 text-[11px]">
        {t("THEME.SAVED.HINT")}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setPrompt({ id: "", name: suggestedName() })}
      >
        <Icon name="bookmark" className="mr-1.5 size-3.5" />
        {t("THEME.SAVED.SAVE_AS")}
      </Button>
      {list.data?.length === 0 && (
        <p className="text-muted-foreground px-1 text-[11px]">
          {t("THEME.SAVED.EMPTY")}
        </p>
      )}
      {list.data?.map((row) => (
        <div
          key={row.id}
          className="ring-foreground/10 flex flex-col gap-2 rounded-lg px-3 py-2 ring-1"
        >
          <div className="min-w-0">
            <div className="text-foreground truncate text-sm font-medium">
              {row.name}
            </div>
            <div className="text-muted-foreground text-xs">
              {dayjs(row.updatedAt).fromNow()}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() =>
                editor.applyBundle({
                  name: row.name,
                  theme: row.themeJson,
                  backgroundImages: row.backgroundImages,
                })
              }
            >
              {t("THEME.SAVED.APPLY")}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label={t("THEME.SAVED.RENAME")}
              onClick={() => setPrompt({ id: row.id, name: row.name })}
            >
              <Icon name="pencil" className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label={t("THEME.SAVED.DELETE")}
              onClick={async () => {
                const ok = await confirm({
                  title: t("THEME.SAVED.DELETE"),
                  description: row.name,
                  confirmLabel: t("COMMON.DELETE"),
                  cancelLabel: t("COMMON.CANCEL"),
                  destructive: true,
                });
                if (ok)
                  remove.mutate(row.id, {
                    onSuccess: () =>
                      toast.success(t("THEME.SAVED.DELETED_DONE"), {
                        position: "top-center",
                      }),
                  });
              }}
            >
              <Icon name="trash-2" className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <Dialog
        open={prompt !== null}
        onOpenChange={(open) => !open && setPrompt(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {prompt?.id ? t("THEME.SAVED.RENAME") : t("THEME.SAVED.SAVE_AS")}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={prompt?.name ?? ""}
            placeholder={t("THEME.SAVED.NAME")}
            onChange={(e) =>
              prompt && setPrompt({ ...prompt, name: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              commit();
            }}
          />
          <DialogFooter>
            <Button
              type="button"
              size="sm"
              disabled={!prompt?.name.trim()}
              onClick={commit}
            >
              {prompt?.id ? t("THEME.SAVED.RENAME") : t("THEME.SAVED.SAVE")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
