"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  useCustomProvidersQuery,
  useDeleteCustomProviderMutation,
} from "@/hooks/ai/custom-providers-hook";
import type { EntityEditId } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  confirmRpDelete,
  RpEntityRow,
  rpFilter,
  RpListDialog,
} from "../shared/rp-list-parts";
import { CustomProviderEditor } from "./editor";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CustomProviderList(props: Props) {
  const t = useTranslations();
  const providersQuery = useCustomProvidersQuery();
  const [rpQuery, setRpQuery] = useState("");
  const deleteMut = useDeleteCustomProviderMutation();
  const [editingId, setEditingId] = useState<EntityEditId>(null);

  const handleDelete = async (id: string) => {
    const ok = await confirmRpDelete(
      t,
      "CHAT.CUSTOM_PROVIDER.DELETE_TITLE",
      "CHAT.CUSTOM_PROVIDER.DELETE_DESC",
    );
    if (!ok) return;
    await deleteMut.mutateAsync(id);
    if (editingId === id) setEditingId(null);
  };

  return (
    <RpListDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      titleKey="CHAT.CUSTOM_PROVIDER.TITLE"
      emptyKey="CHAT.CUSTOM_PROVIDER.EMPTY"
      isEmpty={providersQuery.data?.length === 0 && editingId !== "new"}
      editingId={editingId}
      setEditingId={setEditingId}
      query={rpQuery}
      setQuery={setRpQuery}
      actionsClassName="flex justify-end"
      actions={
        <Button onClick={() => setEditingId("new")}>
          <Icon name="plus" className="size-4" />
          <span className="truncate">{t("CHAT.CUSTOM_PROVIDER.NEW")}</span>
        </Button>
      }
      editor={
        editingId && (
          <CustomProviderEditor
            key={editingId}
            editingId={editingId}
            onDone={() => setEditingId(null)}
          />
        )
      }
    >
      {rpFilter(providersQuery.data, rpQuery, (provider) => [
        provider.name,
        provider.baseUrl,
      ]).map((provider) => (
        <RpEntityRow
          createdAt={provider.createdAt}
          updatedAt={provider.updatedAt}
          key={provider.id}
          onOpen={() => setEditingId(provider.id)}
          leading={
            <Avatar className="size-10">
              <AvatarFallback>
                <Icon name="server" className="size-4" />
              </AvatarFallback>
            </Avatar>
          }
          name={provider.name}
          description={t("CHAT.CUSTOM_PROVIDER.MODEL_COUNT", {
            count: provider.models.length,
          })}
          onDelete={() => handleDelete(provider.id)}
        />
      ))}
    </RpListDialog>
  );
}
