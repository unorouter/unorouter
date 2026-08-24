"use client";

import { EMPTY_METADATA } from "@/lib/api/model-modality";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useImageModelsQuery } from "@/hooks/models/pricing-hook";
import {
  getModelDescriptor,
  imageParams,
  type ImageModelDescriptor,
  defaultParams,
} from "@/lib/ai/image/models";
import { lookupParamSpec, specToImageParams } from "@/lib/ai/image/spec-apply";
import {
  imageFormValues,
  type ImageFormValues,
  type ImageModelId,
} from "@/lib/validation/image";
import { samplerMemoryAtom } from "@/store/image-store";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useAtom } from "jotai";
import { useForm } from "react-hook-form";
import { useImageNav, type GenerateTab } from "../../image-nav";
import { INITIAL_MODEL } from "../../image-constants";
import { isModelInTab } from "../logic/mode";
import { defaultsFor } from "../logic/persistence";
import { useDraftPersistence } from "./use-draft-persistence";
import { useModelTabFit } from "./use-model-tab-fit";
import { useRemixSeed } from "./use-remix-seed";
import { useSnapshotRestore } from "./use-snapshot-restore";

export function useImageForm() {
  const nav = useImageNav();
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;

  const [samplerMemory, setSamplerMemory] = useAtom(samplerMemoryAtom);

  const imageModelsQuery = useImageModelsQuery();
  const effectiveModels = imageModelsQuery.data ?? [];
  const findDescriptor = (id: ImageModelId): ImageModelDescriptor =>
    effectiveModels.find((m) => m.model_name === id) ?? getModelDescriptor(id);

  const form = useForm<ImageFormValues>({
    resolver: typeboxResolver(imageFormValues),
    defaultValues: defaultsFor(getModelDescriptor(INITIAL_MODEL)),
  });

  const selectedModel = form.watch("model") ?? INITIAL_MODEL;
  const baseDescriptor = findDescriptor(selectedModel);
  // Hosted API models (FLUX.2, gpt-image, seedream) carry NO architecture, so requiring
  // one leaves them on the passthrough's blank descriptor.
  const pickedArchitecture = form.watch("ui.airArchitecture");
  const pickedAir = form.watch("ui.air");
  const checkpointSpec =
    pickedAir || pickedArchitecture
      ? lookupParamSpec(pickedAir, pickedArchitecture)
      : null;
  const descriptor: ImageModelDescriptor = checkpointSpec
    ? {
        ...baseDescriptor,
        metadata: {
          ...(baseDescriptor.metadata ?? EMPTY_METADATA),
          imageParams: specToImageParams(checkpointSpec),
        },
      }
    : baseDescriptor;

  const changeModel = (next: string) => {
    const nextDesc = findDescriptor(next);
    form.setValue("model", next);
    const remembered = samplerMemory[next];
    const params = remembered
      ? { ...defaultParams(nextDesc), ...remembered }
      : { ...defaultParams(nextDesc) };
    form.setValue("params", params, {
      shouldDirty: true,
    });
    if (!imageParams(nextDesc).supportsNegativePrompt)
      form.setValue("negativePrompt", "");
    if (!imageParams(nextDesc).supportsReferences)
      form.setValue("references", undefined);
    if (!imageParams(nextDesc).supportsLoraChain)
      form.setValue("loras", undefined);
  };

  const remix = useRemixSeed({ form, findDescriptor });
  const drafts = useDraftPersistence({
    form,
    tab: nav.tab,
    remixId: remix.remixId,
    effectiveModels,
  });
  useModelTabFit({
    form,
    tab: nav.tab,
    effectiveModels,
    changeModel,
    isLoggedIn,
    remixId: remix.remixId,
    draftRestoredTab: drafts.draftRestoredTab,
  });
  useSnapshotRestore({ form, findDescriptor });

  // The TAB follows the model here; the fit hook resolves the other direction and would
  // swap a preset's model out.
  const adoptModelTab = (modelId: string) => {
    if (!effectiveModels.some((m) => m.model_name === modelId)) return;
    const desc = findDescriptor(modelId);
    if (isModelInTab(desc, nav.tab)) return;
    const target: GenerateTab = desc.tabs?.[0] ?? "text2img";
    nav.setTab(target);
    drafts.setDraftRestoredTab(target);
  };

  return {
    form,
    descriptor,
    effectiveModels,
    changeModel,
    adoptModelTab,
    samplerMemory,
    setSamplerMemory,
    setDraft: drafts.setDraft,
  };
}
