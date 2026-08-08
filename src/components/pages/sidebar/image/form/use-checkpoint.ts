"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { GenerationFormValues } from "@/lib/validation/playground";
import type { CustomCheckpoint } from "./model-picker";

/**
 * The selected passthrough checkpoint. ui.air* is the single source of truth: it
 * survives the post-submit remount, rides in drafts, and restores from snapshots.
 * The picked state only carries picker metadata (hero image, nsfw level) that is not
 * worth persisting; it enriches the derived checkpoint while the same air stays
 * selected and is never read as the selection itself.
 */
export function useCheckpoint(form: UseFormReturn<GenerationFormValues>) {
  const [lastPicked, setLastPicked] = useState<CustomCheckpoint | null>(null);

  const air = form.watch("ui.air");
  const airName = form.watch("ui.airName");
  const airArchitecture = form.watch("ui.airArchitecture");

  const picked = lastPicked?.air === air ? lastPicked : null;
  const activeCheckpoint: CustomCheckpoint | null = air
    ? {
        air,
        name: airName ?? air,
        architecture: airArchitecture ?? null,
        heroImage: picked?.heroImage ?? null,
        nsfwLevel: picked?.nsfwLevel ?? null,
      }
    : null;

  const setCheckpoint = (next: CustomCheckpoint | null) => {
    setLastPicked(next);
    form.setValue("ui.air", next?.air, { shouldDirty: true });
    form.setValue("ui.airName", next?.name, { shouldDirty: true });
    form.setValue("ui.airArchitecture", next?.architecture ?? undefined, {
      shouldDirty: true,
    });
  };

  return { activeCheckpoint, setCheckpoint };
}
