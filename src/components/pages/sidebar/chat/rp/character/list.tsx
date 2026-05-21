"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import { SyncBadge } from "@/components/elements/badge/sync-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCharactersQuery,
  useDeleteCharacterMutation,
  useImportCharacterCardMutation,
} from "@/hooks/ai/rp/characters";
import { analytics } from "@/lib/analytics";
import type { EditorState } from "@/lib/types";
import type { CharacterExportFormat } from "@/lib/validation/rp";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useRpExportMutation } from "@/hooks/ai/rp/use-export-mutation";
import { useMediaSrc } from "@/hooks/ai/use-media-src";
import { CharacterEditor } from "./editor";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CharacterList(props: Props) {
  const t = useTranslations();
  const charsQuery = useCharactersQuery();
  const deleteMut = useDeleteCharacterMutation();
  const importMut = useImportCharacterCardMutation();
  const exportMut = useRpExportMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<EditorState>({ mode: "list" });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset editor when dialog closes
    if (!props.open) setView({ mode: "list" });
  }, [props.open]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      await importMut.mutateAsync(file);
      analytics.rp.entityAction({ entity: "characters", action: "imported" });
    } catch {
      analytics.rp.entityAction({
        entity: "characters",
        action: "import_failed",
      });
    }
  };

  const handleExport = (id: string, format: CharacterExportFormat) =>
    exportMut.mutate({ kind: "characters", id, format });

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view.mode === "edit" && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setView({ mode: "list" })}
              >
                <Icon name="arrow-left" className="size-4" />
              </Button>
            )}
            {view.mode === "list"
              ? t("RP.CHARACTERS_TITLE")
              : view.id
                ? t("COMMON.EDIT")
                : t("RP.CHARACTERS_NEW")}
          </DialogTitle>
        </DialogHeader>

        {view.mode === "list" ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/webp,application/json"
                onChange={handleFile}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => {
                  analytics.rp.entityAction({
                    entity: "characters",
                    action: "import_picker_opened",
                  });
                  fileInputRef.current?.click();
                }}
                disabled={importMut.isPending}
                className="min-w-0 flex-1 sm:flex-initial"
              >
                <Icon name="upload" className="size-4" />
                <span className="truncate">{t("RP.CHARACTERS_IMPORT")}</span>
              </Button>
              <Button
                onClick={() => {
                  analytics.rp.entityAction({
                    entity: "characters",
                    action: "create_started",
                  });
                  setView({ mode: "edit" });
                }}
                className="min-w-0 flex-1 sm:flex-initial"
              >
                <Icon name="plus" className="size-4" />
                <span className="truncate">{t("RP.CHARACTERS_NEW")}</span>
              </Button>
            </div>

            {charsQuery.data?.length === 0 && (
              <Card className="text-muted-foreground py-10 text-center text-sm">
                {t("RP.CHARACTERS_EMPTY")}
              </Card>
            )}

            <div className="flex flex-col gap-2">
              {charsQuery.data?.map((c) => (
                <Card
                  key={c.id}
                  className="hover:bg-accent flex cursor-pointer flex-row items-center gap-3 p-3 transition-colors"
                  onClick={() => {
                    analytics.rp.entityAction({
                      entity: "characters",
                      action: "edit_started",
                    });
                    setView({ mode: "edit", id: c.id });
                  }}
                >
                  <CharacterAvatar mediaId={c.avatarMediaId} name={c.name} />

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {c.name}
                    </span>
                    {c.description && (
                      <span className="text-muted-foreground truncate text-xs">
                        {c.description}
                      </span>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <SyncBadge
                      kind="characters"
                      id={c.id}
                      payload={c}
                      compact
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("RP.CHARACTERS_EXPORT")}
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                    >
                      <Icon name="download" className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onClick={() => handleExport(c.id, "png")}
                      >
                        {t("RP.EXPORT_PNG")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport(c.id, "json")}
                      >
                        {t("RP.EXPORT_JSON")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport(c.id, "charx")}
                      >
                        {t("RP.EXPORT_CHARX")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const ok = await confirm({
                        title: t("COMMON.CONFIRM.DELETE_CHARACTER_TITLE"),
                        description: t("COMMON.CONFIRM.DELETE_CHARACTER_DESC"),
                        confirmLabel: t("COMMON.DELETE"),
                        cancelLabel: t("COMMON.CANCEL"),
                        destructive: true,
                      });
                      if (!ok) return;
                      await deleteMut.mutateAsync(c.id);
                      analytics.rp.entityAction({
                        entity: "characters",
                        action: "deleted",
                      });
                    }}
                  >
                    <Icon name="trash-2" className="size-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <CharacterEditor
            characterId={view.id}
            onSaved={() => setView({ mode: "list" })}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CharacterAvatar(props: { mediaId: string | null; name: string }) {
  const src = useMediaSrc(props.mediaId);
  return (
    <Avatar className="size-10">
      {src && <AvatarImage src={src} alt={props.name} />}
      <AvatarFallback>{props.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
    </Avatar>
  );
}
