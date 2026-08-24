"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { ImageFormValues } from "@/lib/validation/image";
import type { CustomCheckpoint } from "../sections/model-picker";

// ui.air* is the single source of truth; lastPicked only enriches it with unpersisted
// picker metadata and is never the selection itself.
export function useCheckpoint(form: UseFormReturn<ImageFormValues>) {
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
