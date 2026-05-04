"use client";
/* eslint-disable react-hooks/set-state-in-effect -- form initialized once when row clicked */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  useCreatePresetMutation,
  useDeletePresetMutation,
  usePresetsQuery,
  useUpdatePresetMutation,
} from "@/hooks/rp-hook";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SamplingForm = {
  name: string;
  temperature: number | null;
  topP: number | null;
  topK: number | null;
  minP: number | null;
  topA: number | null;
  frequencyPenalty: number | null;
  presencePenalty: number | null;
  repetitionPenalty: number | null;
  maxTokens: number | null;
  isDefault: boolean;
};

const empty: SamplingForm = {
  name: "",
  temperature: 1,
  topP: 1,
  topK: null,
  minP: null,
  topA: null,
  frequencyPenalty: 0,
  presencePenalty: 0,
  repetitionPenalty: null,
  maxTokens: null,
  isDefault: false,
};

function NumberKnob(props: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const enabled = props.value !== null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{props.label}</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs tabular-nums">
            {enabled ? props.value : "off"}
          </span>
          <Switch
            checked={enabled}
            onCheckedChange={(v) =>
              props.onChange(v ? (props.min + props.max) / 2 : null)
            }
          />
        </div>
      </div>
      {enabled && (
        <Slider
          min={props.min}
          max={props.max}
          step={props.step ?? 0.01}
          value={[props.value ?? 0]}
          onValueChange={(v) =>
            props.onChange(Array.isArray(v) ? v[0] : v)
          }
        />
      )}
    </div>
  );
}

export function PresetList(props: Props) {
  const t = useTranslations();
  const presetsQuery = usePresetsQuery();
  const createMut = useCreatePresetMutation();
  const updateMut = useUpdatePresetMutation();
  const deleteMut = useDeletePresetMutation();

  const [editingId, setEditingIdRaw] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<SamplingForm>(empty);

  useEffect(() => {
    if (!props.open) setEditingIdRaw(null);
  }, [props.open]);

  // Direct setter that synchronously seeds the form.
  const setEditingId = (id: string | "new" | null) => {
    setEditingIdRaw(id);
    if (id === "new") {
      setForm(empty);
    } else if (id) {
      const p = presetsQuery.data?.find((x) => x.id === id);
      if (p) {
        setForm({
          name: p.name,
          temperature: p.temperature ?? null,
          topP: p.topP ?? null,
          topK: p.topK ?? null,
          minP: p.minP ?? null,
          topA: p.topA ?? null,
          frequencyPenalty: p.frequencyPenalty ?? null,
          presencePenalty: p.presencePenalty ?? null,
          repetitionPenalty: p.repetitionPenalty ?? null,
          maxTokens: p.maxTokens ?? null,
          isDefault: p.isDefault ?? false,
        });
      }
    }
  };

  const handleSave = async () => {
    if (editingId === "new") {
      await createMut.mutateAsync({ body: form });
    } else if (editingId) {
      await updateMut.mutateAsync({ id: editingId, body: form });
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    await deleteMut.mutateAsync(id);
    if (editingId === id) setEditingId(null);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("RP.PRESETS_TITLE")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button onClick={() => setEditingId("new")}>
              <LuPlus className="size-4" />
              {t("RP.PRESETS_NEW")}
            </Button>
          </div>

          {presetsQuery.data?.length === 0 && editingId !== "new" && (
            <Card className="text-muted-foreground py-10 text-center text-sm">
              {t("RP.PRESETS_EMPTY")}
            </Card>
          )}

      {editingId && (
        <Card className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-2">
            <Label>{t("COMMON.NAME")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <NumberKnob
            label={t("RP.SAMPLING_TEMPERATURE")}
            value={form.temperature}
            onChange={(v) => setForm((prev) => ({ ...prev, temperature: v }))}
            min={0}
            max={2}
          />
          <NumberKnob
            label={t("RP.SAMPLING_TOP_P")}
            value={form.topP}
            onChange={(v) => setForm((prev) => ({ ...prev, topP: v }))}
            min={0}
            max={1}
          />
          <NumberKnob
            label={t("RP.SAMPLING_TOP_K")}
            value={form.topK}
            onChange={(v) => setForm((prev) => ({ ...prev, topK: v }))}
            min={0}
            max={200}
            step={1}
          />
          <NumberKnob
            label={t("RP.SAMPLING_MIN_P")}
            value={form.minP}
            onChange={(v) => setForm((prev) => ({ ...prev, minP: v }))}
            min={0}
            max={1}
          />
          <NumberKnob
            label={t("RP.SAMPLING_TOP_A")}
            value={form.topA}
            onChange={(v) => setForm((prev) => ({ ...prev, topA: v }))}
            min={0}
            max={1}
          />
          <NumberKnob
            label={t("RP.SAMPLING_FREQUENCY_PENALTY")}
            value={form.frequencyPenalty}
            onChange={(v) => setForm((prev) => ({ ...prev, frequencyPenalty: v }))}
            min={-2}
            max={2}
          />
          <NumberKnob
            label={t("RP.SAMPLING_PRESENCE_PENALTY")}
            value={form.presencePenalty}
            onChange={(v) => setForm((prev) => ({ ...prev, presencePenalty: v }))}
            min={-2}
            max={2}
          />
          <NumberKnob
            label={t("RP.SAMPLING_REPETITION_PENALTY")}
            value={form.repetitionPenalty}
            onChange={(v) => setForm((prev) => ({ ...prev, repetitionPenalty: v }))}
            min={0}
            max={2}
          />
          <NumberKnob
            label={t("RP.SAMPLING_MAX_TOKENS")}
            value={form.maxTokens}
            onChange={(v) => setForm((prev) => ({ ...prev, maxTokens: v }))}
            min={1}
            max={32000}
            step={1}
          />

          <div className="flex items-center justify-between">
            <Label>{t("RP.PRESET_DEFAULT")}</Label>
            <Switch
              checked={form.isDefault}
              onCheckedChange={(v) => setForm((prev) => ({ ...prev, isDefault: v }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              {t("COMMON.CANCEL")}
            </Button>
            <Button onClick={handleSave} disabled={!form.name}>
              {t("COMMON.SAVE")}
            </Button>
          </div>
        </Card>
      )}

      {!editingId && <div className="flex flex-col gap-2">
        {presetsQuery.data?.map((p) => (
          <Card
            key={p.id}
            className="hover:bg-accent flex flex-row cursor-pointer items-center gap-3 p-3 transition-colors"
            onClick={() => setEditingId(p.id)}
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">
                {p.name}
                {p.isDefault && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    ({t("RP.PRESET_DEFAULT").toLowerCase()})
                  </span>
                )}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                T={p.temperature ?? "off"} | TopP={p.topP ?? "off"} | TopK=
                {p.topK ?? "off"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(p.id);
              }}
            >
              <LuTrash2 className="size-4" />
            </Button>
          </Card>
        ))}
      </div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
