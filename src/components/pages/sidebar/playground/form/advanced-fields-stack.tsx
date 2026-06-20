"use client";

import type { PlaygroundModelDescriptor } from "@/lib/ai/playground/models";
import type { GenerationFormValues } from "@/lib/validation/playground";
import type { UseFormReturn } from "react-hook-form";
import {
  AdetailerSection,
  type AdetailerValue,
} from "../fields/adetailer-section";
import { AdvancedSettingsAccordion } from "../fields/advanced-settings-accordion";
import type { EmbeddingEntry } from "../fields/embedding-picker";
import { EmbeddingPicker } from "../fields/embedding-picker";
import { LayerDiffusionField } from "../fields/layer-diffusion-field";
import { UpscalerField } from "../fields/upscaler-field";
import { VaePicker } from "../fields/vae-picker";
import { patchParams } from "./form-helpers";

type Props = {
  form: UseFormReturn<GenerationFormValues>;
  descriptor: PlaygroundModelDescriptor;
};

// The optional advanced field block (embedding/VAE/adetailer/layer-diffusion/upscaler/clip-skip), each gated on the model descriptor.
export function AdvancedFieldsStack(props: Props) {
  const form = props.form;
  const descriptor = props.descriptor;
  const params = (form.watch("params") ?? {}) as Record<string, unknown>;

  return (
    <>
      {descriptor.supportsEmbedding && (
        <EmbeddingPicker
          family={descriptor.family}
          value={(params.embeddings as EmbeddingEntry[] | undefined) ?? []}
          onChange={(embeddings) =>
            patchParams(form, {
              embeddings: embeddings.length > 0 ? embeddings : undefined,
            })
          }
        />
      )}

      {descriptor.supportsVae && (
        <VaePicker
          value={params.vae as string | undefined}
          onChange={(vae) => patchParams(form, { vae })}
        />
      )}

      {descriptor.supportsAdetailer && (
        <AdetailerSection
          family={descriptor.family}
          value={params.adetailer as AdetailerValue | undefined}
          onChange={(adetailer) => patchParams(form, { adetailer })}
        />
      )}

      {descriptor.supportsLayerDiffusion && (
        <LayerDiffusionField
          value={params.layerDiffusion as { weight: number } | undefined}
          onChange={(layerDiffusion) => patchParams(form, { layerDiffusion })}
        />
      )}

      {descriptor.supportsHiresFix && (
        <UpscalerField
          upscaler={params.upscaler as string | undefined}
          multiplier={
            (params.upscalerMultiplier as number | undefined) ??
            (params.hiresUpscale as number | undefined)
          }
          hiresSteps={params.hiresSteps as number | undefined}
          denoise={params.hiresDenoise as number | undefined}
          onChange={(patch) =>
            patchParams(form, {
              ...(patch.upscaler !== undefined && {
                upscaler: patch.upscaler,
              }),
              ...(patch.multiplier !== undefined && {
                upscalerMultiplier: patch.multiplier,
                hiresUpscale: patch.multiplier,
              }),
              ...(patch.hiresSteps !== undefined && {
                hiresSteps: patch.hiresSteps,
              }),
              ...(patch.denoise !== undefined && {
                hiresDenoise: patch.denoise,
              }),
            })
          }
        />
      )}

      {descriptor.supportsClipSkip && (
        <AdvancedSettingsAccordion
          clipSkip={params.clipSkip as number | undefined}
          ensd={params.ensd as number | undefined}
          onChange={(patch) => patchParams(form, patch)}
        />
      )}
    </>
  );
}
