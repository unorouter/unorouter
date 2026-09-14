"use client";

import { SortableList } from "@/components/elements/dnd/sortable-list";
import { confirm } from "@/components/ui/confirm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import {
  useDeleteLorebookEntryMutation,
  useLorebookQuery,
  useReorderLorebookEntriesMutation,
  useSetLorebookEntriesRoleMutation,
} from "@/hooks/ai/rp/lorebooks";
import { analytics } from "@/lib/analytics";
import type { EntityEditId, TranslationKey } from "@/lib/types";
import {
  LOREBOOK_INJECTION_ROLES,
  type LorebookInjectionRole,
} from "@/lib/validation/rp";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LorebookEntryForm } from "./lorebook-entry-form";

const ROLE_LABEL_KEY: Record<LorebookInjectionRole, TranslationKey> = {
  user: "RP.LOREBOOK_ENTRY_INJECTION_ROLE_USER",
  system: "RP.LOREBOOK_ENTRY_INJECTION_ROLE_SYSTEM",
  assistant: "RP.LOREBOOK_ENTRY_INJECTION_ROLE_ASSISTANT",
};

export function LorebookEntries(props: { lorebookId: string }) {
  const t = useTranslations();
  const lbQuery = useLorebookQuery(props.lorebookId);
  const deleteMut = useDeleteLorebookEntryMutation(props.lorebookId);
  const reorderMut = useReorderLorebookEntriesMutation(props.lorebookId);
  const setRoleMut = useSetLorebookEntriesRoleMutation(props.lorebookId);

  const [editingId, setEditingId] = useState<EntityEditId>(null);

  const editingEntry =
    editingId && editingId !== "new"
      ? (lbQuery.data?.entries.find((x) => x.id === editingId) ?? null)
      : null;

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: t("COMMON.CONFIRM.DELETE_LOREBOOK_ENTRY_TITLE"),
      description: t("COMMON.CONFIRM.DELETE_LOREBOOK_ENTRY_DESC"),
      confirmLabel: t("COMMON.DELETE"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
    await deleteMut.mutateAsync(id);
    analytics.rp.entityAction({
      entity: "lorebook_entries",
      action: "deleted",
    });
    if (editingId === id) setEditingId(null);
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-lg font-medium">
          {t("RP.LOREBOOK_ENTRIES_TITLE")}
        </h2>
        <div className="flex items-center gap-2">
          {(lbQuery.data?.entries.length ?? 0) > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" />}
                disabled={setRoleMut.isPending}
              >
                <Icon name="users" className="size-4" />
                {t("RP.LOREBOOK_ENTRIES_SET_ROLE")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {LOREBOOK_INJECTION_ROLES.map((role) => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => setRoleMut.mutate(role)}
                  >
                    {t(ROLE_LABEL_KEY[role])}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            onClick={() => {
              analytics.rp.entityAction({
                entity: "lorebook_entries",
                action: "create_started",
              });
              setEditingId("new");
            }}
            size="sm"
          >
            <Icon name="plus" className="size-4" />
            {t("RP.LOREBOOK_ENTRY_NEW")}
          </Button>
        </div>
      </div>

      {editingId && (
        <LorebookEntryForm
          lorebookId={props.lorebookId}
          editingId={editingId}
          entry={editingEntry}
          onDone={() => setEditingId(null)}
        />
      )}

      {!editingId && lbQuery.data?.entries && (
        <SortableList
          items={[...lbQuery.data.entries].sort(
            (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
          )}
          onReorder={(orderedIds) => reorderMut.mutate(orderedIds)}
          renderItem={(e, handle) => (
            <Card
              className="hover:bg-accent flex cursor-pointer flex-row items-start gap-2 p-3 transition-colors"
              onClick={() => {
                analytics.rp.entityAction({
                  entity: "lorebook_entries",
                  action: "edit_started",
                });
                setEditingId(e.id);
              }}
            >
              <div onClick={(ev) => ev.stopPropagation()}>{handle}</div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-1.5">
                  {e.constant && (
                    <span className="bg-primary/15 text-primary inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                      {t("RP.LOREBOOK_ENTRY_CONSTANT")}
                    </span>
                  )}
                  <span className="truncate text-sm font-medium">
                    {e.comment ||
                      (e.constant
                        ? t("RP.LOREBOOK_ENTRY_ALWAYS_LABEL")
                        : (e.keys ?? []).join(", ") ||
                          t("RP.LOREBOOK_ENTRY_NO_KEYS"))}
                  </span>
                </div>
                <span className="text-muted-foreground line-clamp-2 text-xs">
                  {e.content}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(ev) => {
                  ev.stopPropagation();
                  handleDelete(e.id);
                }}
              >
                <Icon name="trash-2" className="size-4" />
              </Button>
            </Card>
          )}
        />
      )}
    </Card>
  );
}
