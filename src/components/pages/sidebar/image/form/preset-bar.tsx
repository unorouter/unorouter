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
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  /** Everything the current form holds, minus the prompt. */
  current: {
    model: string;
    negativePrompt?: string | null;
    params?: ImagePreset["params"];
    loras?: ImagePreset["loras"];
    extraParams?: ImagePreset["extraParams"];
  };
  onApply: (preset: ImagePreset) => void;
};

/**
 * Saved generation setups. The prompt is deliberately not part of one: it is the field that
 * changes every time, while the model, size, sampler and LoRA chain are the parts a user
 * rebuilds by hand on every visit.
 */
export function PresetBar(props: Props) {
  const t = useTranslations();
  const presetsQuery = useImagePresetsQuery();
  const savePreset = useSaveImagePresetMutation();
  const deletePreset = useDeleteImagePresetMutation();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  const presets = presetsQuery.data ?? [];
  const selectedPreset = presets.find((p) => p.id === selectedId) ?? null;

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const saved = await savePreset.mutateAsync({
      name: trimmed,
      model: props.current.model,
      negativePrompt: props.current.negativePrompt,
      params: props.current.params,
      loras: props.current.loras,
      extraParams: props.current.extraParams,
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
            {/* Rendered from the row rather than by SelectValue: the item that carries the
                label only mounts while the list is open, so the trigger fell back to the raw
                id once closed. */}
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

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setNaming((v) => !v)}
        >
          <Icon name="save" className="mr-2 h-3.5 w-3.5" />
          {t("IMAGE.PRESET_SAVE")}
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
