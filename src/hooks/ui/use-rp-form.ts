"use client";

import { formDefaults } from "@/lib/validation/helpers";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import type { Static, TObject } from "@sinclair/typebox/type";
import { useForm, type DefaultValues } from "react-hook-form";

export function useRpForm<T extends TObject>(
  schema: T,
  values: Static<T> | undefined,
) {
  return useForm({
    resolver: typeboxResolver(schema),
    defaultValues: formDefaults(schema) as DefaultValues<Static<T>>,
    values,
    resetOptions: { keepDirtyValues: true },
  });
}
