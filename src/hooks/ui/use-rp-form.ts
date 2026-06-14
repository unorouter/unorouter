"use client";

import { formDefaults } from "@/lib/validation/helpers";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import type { Static, TObject } from "@sinclair/typebox/type";
import { useForm, type DefaultValues } from "react-hook-form";

    // Shared RP editor form wiring: values syncs the row on settle; keepDirtyValues stops a refetch clobbering typing.
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
