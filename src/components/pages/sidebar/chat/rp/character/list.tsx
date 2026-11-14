"use client";

import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  useCharactersQuery,
  useDeleteCharacterMutation,
  useDuplicateCharacterMutation,
  useImportCharacterCardMutation,
  useImportCharacterFromUrlMutation,
} from "@/hooks/ai/rp/characters";
import type { EditorState } from "@/lib/types";
import type { CharacterExportFormat } from "@/lib/validation/rp";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRpExportMutation } from "@/hooks/ai/rp/use-export-mutation";
import {
  confirmRpDelete,
  RpAvatar,
  RpEntityRow,
  rpFilter,
  RpExportMenu,
  RP_ACTION_BUTTON,
  RpImportControl,
  RpListDialog,
} from "../shared/rp-list-parts";
import { useToggleFavoriteMutation } from "@/hooks/ai/rp/favorites";
import { CharacterEditor } from "./editor";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CharacterList(props: Props) {
  const t = useTranslations();
  const charsQuery = useCharactersQuery();
  const [rpQuery, setRpQuery] = useState("");
  const deleteMut = useDeleteCharacterMutation();
  const duplicateMut = useDuplicateCharacterMutation();
  const importMut = useImportCharacterCardMutation();
  const importUrlMut = useImportCharacterFromUrlMutation();
  const exportMut = useRpExportMutation();
  const favoriteMut = useToggleFavoriteMutation("character");

  const [view, setView] = useState<EditorState>({ mode: "list" });

  const handleExport = (id: string, format: CharacterExportFormat) =>
    exportMut.mutate({ kind: "characters", id, format });

  return (
    <RpListDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      className="sm:max-w-2xl"
      titleKey="RP.CHARACTERS_TITLE"
      title={
        view.mode === "edit"
          ? t(view.id ? "COMMON.EDIT" : "RP.CHARACTERS_NEW")
          : undefined
      }
      onBack={
        view.mode === "edit" ? () => setView({ mode: "list" }) : undefined
      }
      emptyKey="RP.CHARACTERS_EMPTY"
      isEmpty={charsQuery.data?.length === 0}
      editingId={view.mode === "edit" ? (view.id ?? "new") : null}
      query={rpQuery}
      setQuery={setRpQuery}
      actions={
        <>
          <RpImportControl
            accept="image/png,image/webp,application/json"
            labelKey="RP.CHARACTERS_IMPORT"
            isPending={importMut.isPending || importUrlMut.isPending}
            onFile={(file) => importMut.mutateAsync(file).then(() => {})}
            onUrl={(input) => importUrlMut.mutateAsync(input).then(() => {})}
            urlLabelKey="RP.CHARACTERS_IMPORT_LINK"
            urlPlaceholderKey="RP.CHARACTERS_IMPORT_LINK_PLACEHOLDER"
          />
          <Button
            onClick={() => setView({ mode: "edit" })}
            className={RP_ACTION_BUTTON}
          >
            <Icon name="plus" className="size-4" />
            {t("RP.CHARACTERS_NEW")}
          </Button>
        </>
      }
      editor={
        view.mode === "edit" && (
          <CharacterEditor
            key={view.id}
            characterId={view.id}
            onSaved={() => setView({ mode: "list" })}
          />
        )
      }
    >
      {rpFilter(charsQuery.data, rpQuery, (c) => [c.name, c.description]).map(
        (c) => (
          <RpEntityRow
            createdAt={c.createdAt}
            updatedAt={c.updatedAt}
            key={c.id}
            favorite={{
              on: c.isFavorite,
              onToggle: () =>
                favoriteMut.mutate({ id: c.id, isFavorite: !c.isFavorite }),
            }}
            onOpen={() => setView({ mode: "edit", id: c.id })}
            leading={<RpAvatar mediaId={c.avatarMediaId} name={c.name} />}
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
            }}
          />
        ),
      )}
    </RpListDialog>
  );
}
