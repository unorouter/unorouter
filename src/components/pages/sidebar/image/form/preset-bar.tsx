"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { confirm } from "@/components/ui/confirm";
import {
  useDeleteImagePresetMutation,
  useImagePresetsQuery,
  useSaveImagePresetMutation,
} from "@/hooks/ai/image-catalog-hook";
import type { ImagePreset } from "@/lib/db/schema/client";
import { selectedPresetIdAtom } from "@/store/image-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";

type PresetValues = {
  model: string | undefined;
  negativePrompt?: string | null;
  params?: ImagePreset["params"];
  loras?: ImagePreset["loras"] | undefined;
  extraParams?: ImagePreset["extraParams"] | undefined;
};

type Props = {
  /** Read at SAVE time, so the bar does not subscribe to every form field. */
  getCurrent: () => PresetValues;
  onApply: (preset: ImagePreset) => void;
};

/**
 * Saved generation setups. The positive prompt is deliberately excluded (it changes per
 * generation); the negative prompt is the boilerplate a setup exists to carry.
 */
export function PresetBar(props: Props) {
  const t = useTranslations();
  const presetsQuery = useImagePresetsQuery();
  const savePreset = useSaveImagePresetMutation();
  const deletePreset = useDeleteImagePresetMutation();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useAtom(selectedPresetIdAtom);

  const presets = presetsQuery.data ?? [];
  const selectedPreset = presets.find((p) => p.id === selectedId) ?? null;

  // Saving is keyed by NAME (the data layer overwrites a same-named row).
  const onOverwrite = async () => {
    if (!selectedPreset) return;
    const ok = await confirm({
      title: t("IMAGE.PRESET_OVERWRITE_CONFIRM", { name: selectedPreset.name }),
      confirmLabel: t("IMAGE.PRESET_OVERWRITE"),
      cancelLabel: t("COMMON.CANCEL"),
    });
    if (!ok) return;
    const current = props.getCurrent();
    await savePreset.mutateAsync({
      name: selectedPreset.name,
      model: current.model ?? "",
      prompt: null,
      negativePrompt: current.negativePrompt,
      params: current.params,
      loras: current.loras,
      extraParams: current.extraParams,
    });
    setNaming(false);
  };

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = props.getCurrent();
    const saved = await savePreset.mutateAsync({
      name: trimmed,
      model: current.model ?? "",
      prompt: null,
      negativePrompt: current.negativePrompt,
      params: current.params,
      loras: current.loras,
      extraParams: current.extraParams,
    });
    setSelectedId(saved.id);
    setName("");
    setNaming(false);
  };

  const onDelete = async () => {
    const preset = presets.find((p) => p.id === selectedId);
    if (!preset) return;
    const ok = await confirm({
      title: t("IMAGE.PRESET_DELETE_CONFIRM", { name: preset.name }),
      confirmLabel: t("COMMON.DELETE"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
    await deletePreset.mutateAsync(preset.id);
    setSelectedId("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select
          value={selectedId}
          onValueChange={(id) => {
            // Re-picking the equipped preset must not re-apply it over unsaved edits.
            if (id === selectedId) return;
            setSelectedId(id ?? "");
            const preset = presets.find((p) => p.id === id);
            if (preset) props.onApply(preset);
          }}
          disabled={presets.length === 0}
        >
          <SelectTrigger
            aria-label={t("IMAGE.PRESET_LABEL")}
            className="min-w-0 flex-1"
          >
            {/* From the row, not SelectValue: items only mount while the list is open. */}
            {selectedPreset ? (
              <span className="truncate">{selectedPreset.name}</span>
            ) : (
              <span className="text-muted-foreground">
                {presets.length === 0
                  ? t("IMAGE.PRESET_EMPTY")
                  : t("IMAGE.PRESET_PLACEHOLDER")}
              </span>
            )}
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedPreset && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={savePreset.isPending}
            onClick={() => void onOverwrite()}
          >
            <Icon name="save" className="mr-2 h-3.5 w-3.5" />
            {t("IMAGE.PRESET_OVERWRITE")}
          </Button>
        )}

        <Button
          type="button"
          variant={selectedPreset ? "ghost" : "secondary"}
          size="sm"
          onClick={() => setNaming((v) => !v)}
        >
          <Icon
            name={selectedPreset ? "plus" : "save"}
            className="mr-2 h-3.5 w-3.5"
          />
          {selectedPreset
            ? t("IMAGE.PRESET_SAVE_AS_NEW")
            : t("IMAGE.PRESET_SAVE")}
        </Button>

        {selectedId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t("IMAGE.PRESET_DELETE")}
            onClick={() => void onDelete()}
          >
            <Icon name="trash-2" className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {naming && (
        <div className="flex gap-2">
          <Input
            autoFocus
            value={name}
            placeholder={t("IMAGE.PRESET_NAME_PLACEHOLDER")}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void onSave();
              }
              if (e.key === "Escape") setNaming(false);
            }}
          />
          <Button
            type="button"
            size="sm"
            disabled={!name.trim() || savePreset.isPending}
            onClick={() => void onSave()}
          >
            {t("IMAGE.PRESET_SAVE_CONFIRM")}
          </Button>
        </div>
      )}
    </div>
  );
}
