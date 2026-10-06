"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import {
  useCustomProvidersQuery,
  useDeleteCustomProviderMutation,
  useDuplicateCustomProviderMutation,
} from "@/hooks/ai/custom-providers-hook";
import type { EntityEditId } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RpEntityPage } from "../shared/rp-entity-page";
import {
  confirmRpDelete,
  RpEmptyCard,
  RpEntityRow,
  rpFilter,
} from "../shared/rp-list-parts";
import { CustomProviderEditor } from "./editor";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function CustomProvidersPage() {
  const t = useTranslations();
  const providersQuery = useCustomProvidersQuery();
  const [rpQuery, setRpQuery] = useState("");
  const deleteMut = useDeleteCustomProviderMutation();
  const duplicateMut = useDuplicateCustomProviderMutation();
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
    <RpEntityPage
      search={rpQuery}
      onSearchChange={setRpQuery}
      titleKey="CHAT.CUSTOM_PROVIDER.TITLE"
      subtitleKey="CHAT.CUSTOM_PROVIDER.PAGE_SUBTITLE"
      newLabelKey="CHAT.CUSTOM_PROVIDER.NEW"
      backLabelKey="CHAT.CUSTOM_PROVIDER.BACK"
      isEditing={editingId !== null}
      onNew={() => setEditingId("new")}
      onBack={() => setEditingId(null)}
      editor={
        editingId && (
          <CustomProviderEditor
            key={editingId}
            editingId={editingId}
            onDone={() => setEditingId(null)}
          />
        )
      }
      list={
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {providersQuery.data?.length === 0 && (
            <RpEmptyCard labelKey="CHAT.CUSTOM_PROVIDER.EMPTY" />
          )}
          {rpFilter(providersQuery.data, rpQuery, (p) => [
            p.name,
            p.baseUrl,
          ]).map((p) => (
            <RpEntityRow
              key={p.id}
              createdAt={p.createdAt}
              updatedAt={p.updatedAt}
              onOpen={() => setEditingId(p.id)}
              leading={<VendorIcon vendor={p.name} size={32} />}
              name={p.name}
              description={`${t("CHAT.CUSTOM_PROVIDER.MODEL_COUNT", {
                count: p.models.length,
              })}, ${hostOf(p.baseUrl)}`}
              onDuplicate={() => duplicateMut.mutate(p.id)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      }
    />
  );
}
