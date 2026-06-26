"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import {
  useCustomProvidersQuery,
  useDeleteCustomProviderMutation,
} from "@/hooks/ai/custom-providers-hook";
import type { EntityEditId } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  confirmRpDelete,
  RpEmptyCard,
  RpEntityRow,
} from "../shared/rp-list-parts";
import { CustomProviderEditor } from "./editor";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CustomProviderList(props: Props) {
  const t = useTranslations();
  const providersQuery = useCustomProvidersQuery();
  const deleteMut = useDeleteCustomProviderMutation();
  const [editingId, setEditingId] = useState<EntityEditId>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset editor when dialog closes
    if (!props.open) setEditingId(null);
  }, [props.open]);

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
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-x-hidden overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("CHAT.CUSTOM_PROVIDER.TITLE")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button onClick={() => setEditingId("new")}>
              <Icon name="plus" className="size-4" />
              <span className="truncate">
                {t("CHAT.CUSTOM_PROVIDER.NEW")}
              </span>
            </Button>
          </div>

          {providersQuery.data?.length === 0 && editingId !== "new" && (
            <RpEmptyCard labelKey="CHAT.CUSTOM_PROVIDER.EMPTY" />
          )}

          {editingId && (
            <CustomProviderEditor
              key={editingId}
              editingId={editingId}
              onDone={() => setEditingId(null)}
            />
          )}

          {!editingId && (
            <div className="flex flex-col gap-2">
              {providersQuery.data?.map((provider) => (
                <RpEntityRow
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
