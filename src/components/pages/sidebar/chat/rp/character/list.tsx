"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCharactersQuery,
  useDeleteCharacterMutation,
  useDuplicateCharacterMutation,
  useImportCharacterCardMutation,
  useImportCharacterFromUrlMutation,
} from "@/hooks/ai/rp/characters";
import { analytics } from "@/lib/analytics";
import type { EditorState } from "@/lib/types";
import type { CharacterExportFormat } from "@/lib/validation/rp";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRpExportMutation } from "@/hooks/ai/rp/use-export-mutation";
import { useMediaSrc } from "@/hooks/ai/use-media-src";
import {
  confirmRpDelete,
  RpEmptyCard,
  RpEntityRow,
  RpExportMenu,
  RpImportControl,
} from "../shared/rp-list-parts";
import { CharacterEditor } from "./editor";
import { DatacatImportDialog } from "./datacat-import-dialog";
import { datacatCharacterId } from "@/lib/ai/rp/datacat-bridge";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CharacterList(props: Props) {
  const t = useTranslations();
  const charsQuery = useCharactersQuery();
  const deleteMut = useDeleteCharacterMutation();
  const duplicateMut = useDuplicateCharacterMutation();
  const importMut = useImportCharacterCardMutation();
  const importUrlMut = useImportCharacterFromUrlMutation();
  const exportMut = useRpExportMutation();

  const [view, setView] = useState<EditorState>({ mode: "list" });
  const [datacatId, setDatacatId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset editor when dialog closes
    if (!props.open) setView({ mode: "list" });
  }, [props.open]);

  const handleExport = (id: string, format: CharacterExportFormat) =>
    exportMut.mutate({ kind: "characters", id, format });

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
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
              <RpImportControl
                entity="characters"
                accept="image/png,image/webp,application/json"
                labelKey="RP.CHARACTERS_IMPORT"
                isPending={importMut.isPending || importUrlMut.isPending}
                onFile={(file) => importMut.mutateAsync(file).then(() => {})}
                onUrl={async (input) => {
                  try {
                    await importUrlMut.mutateAsync(input);
                  } catch (error) {
                    // JanitorAI and its mirrors answer a server fetch with a
                    // Cloudflare challenge, so the only way to reach them is
                    // from the visitor's own browser.
                    const id = datacatCharacterId(input);
                    if (!id) throw error;
                    setDatacatId(id);
                  }
                }}
                urlLabelKey="RP.CHARACTERS_IMPORT_LINK"
                urlPlaceholderKey="RP.CHARACTERS_IMPORT_LINK_PLACEHOLDER"
              />
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
              <RpEmptyCard labelKey="RP.CHARACTERS_EMPTY" />
            )}

            <div className="flex flex-col gap-2">
              {charsQuery.data?.map((c) => (
                <RpEntityRow
                  key={c.id}
                  onOpen={() => {
                    analytics.rp.entityAction({
                      entity: "characters",
                      action: "edit_started",
                    });
                    setView({ mode: "edit", id: c.id });
                  }}
                  leading={
                    <CharacterAvatar mediaId={c.avatarMediaId} name={c.name} />
                  }
                  name={c.name}
                  description={c.description}
                  actions={
                    <RpExportMenu
                      ariaLabel={t("RP.CHARACTERS_EXPORT")}
                      items={[
                        {
                          label: t("RP.EXPORT_PNG"),
                          onClick: () => handleExport(c.id, "png"),
                        },
                        {
                          label: t("RP.EXPORT_JSON"),
                          onClick: () => handleExport(c.id, "json"),
                        },
                        {
                          label: t("RP.EXPORT_CHARX"),
                          onClick: () => handleExport(c.id, "charx"),
                        },
                      ]}
                    />
                  }
                  onDuplicate={() => duplicateMut.mutate(c.id)}
                  onDelete={async () => {
                    const ok = await confirmRpDelete(
                      t,
                      "COMMON.CONFIRM.DELETE_CHARACTER_TITLE",
                      "COMMON.CONFIRM.DELETE_CHARACTER_DESC",
                    );
                    if (!ok) return;
                    await deleteMut.mutateAsync(c.id);
                    analytics.rp.entityAction({
                      entity: "characters",
                      action: "deleted",
                    });
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <CharacterEditor
            key={view.id}
            characterId={view.id}
            onSaved={() => setView({ mode: "list" })}
          />
        )}
      </DialogContent>
      <DatacatImportDialog
        characterId={datacatId}
        onClose={() => setDatacatId(null)}
        onCard={(file) => importMut.mutateAsync(file).then(() => {})}
      />
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
