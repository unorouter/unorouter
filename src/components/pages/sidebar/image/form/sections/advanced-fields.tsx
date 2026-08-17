"use client";

import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmbeddingCatalogQuery } from "@/hooks/ai/image-catalog-hook";
import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ImageFormValues } from "@/lib/validation/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { AdetailerSection } from "../../fields/adetailer-section";
import { CatalogChainPicker } from "../../fields/catalog-chain-picker";
import { LabeledSlider } from "../../fields/labeled-slider";
import { UpscalerField } from "../../fields/upscaler-field";
import { VAES } from "../../image-constants";

type Props = {
  form: UseFormReturn<ImageFormValues>;
  descriptor: ImageModelDescriptor;
};

// The advanced stack: embeddings, VAE, ADetailer, upscale, clip skip. Every field binds
// through its own Controller, so none of them re-render the form root.
export function AdvancedFields(props: Props) {
  const form = props.form;
  const descriptor = props.descriptor;

  return (
    <>
      {descriptor.supportsEmbedding && (
        <Controller
          control={form.control}
          name="params.embeddings"
          render={({ field }) => (
            <EmbeddingPicker
              value={field.value ?? []}
              onChange={(next) =>
                field.onChange(next.length > 0 ? next : undefined)
              }
            />
          )}
        />
      )}

      {descriptor.supportsVae && (
        <Controller
          control={form.control}
          name="params.vae"
          render={({ field }) => (
            <VaePicker value={field.value} onChange={field.onChange} />
          )}
        />
      )}

      {descriptor.supportsAdetailer && (
        <Controller
          control={form.control}
          name="params.adetailer"
          render={({ field }) => (
            <AdetailerSection value={field.value} onChange={field.onChange} />
          )}
        />
      )}

      {descriptor.supportsHiresFix && <UpscalerField form={form} />}

      {descriptor.supportsClipSkip && (
        <Controller
          control={form.control}
          name="params.clipSkip"
          render={({ field }) => (
            <ClipSkipAccordion
              clipSkip={field.value}
              onChange={field.onChange}
            />
          )}
        />
      )}
    </>
  );
}

type EmbeddingEntry = NonNullable<
  NonNullable<ImageFormValues["params"]>["embeddings"]
>[number];

function EmbeddingPicker(props: {
  value: EmbeddingEntry[];
  onChange: (next: EmbeddingEntry[]) => void;
}) {
  const catalog = useEmbeddingCatalogQuery({});
  return (
    <CatalogChainPicker
      titleKey="IMAGE.EMBEDDINGS_TITLE"
      emptyKey="IMAGE.EMBEDDINGS_EMPTY"
      items={catalog.data?.items ?? []}
      isLoading={catalog.isLoading}
      value={props.value.map((e) => ({ name: e.name, weight: e.weight ?? 1 }))}
      onAddPayload={(item) => ({ name: item.air, weight: 1.0 })}
      onChange={props.onChange}
    />
  );
}

function VaePicker(props: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
}) {
  const t = useTranslations();
  return (
    <div>
      <Label className="mb-1 block">{t("IMAGE.VAE")}</Label>
      <Select
        value={props.value ?? "automatic"}
        onValueChange={(next) =>
          props.onChange(!next || next === "automatic" ? undefined : next)
        }
      >
        <SelectTrigger aria-label={t("IMAGE.VAE")} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VAES.map((vae) => (
            <SelectItem key={vae.value} value={vae.value}>
              {vae.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ClipSkipAccordion(props: {
  clipSkip: number | undefined;
  onChange: (next: number) => void;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
      >
        <Icon
          name={open ? "chevron-down" : "chevron-right"}
          className="h-4 w-4"
        />
        {t("IMAGE.ADVANCED_SETTINGS")}
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t p-3">
          <LabeledSlider
            label={t("IMAGE.CLIP_SKIP")}
            min={0}
            max={12}
            step={1}
            value={props.clipSkip ?? 2}
            onChange={props.onChange}
          />
        </div>
      )}
    </div>
  );
}
