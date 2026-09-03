"use client";

import { formDefaults } from "@/lib/validation/helpers";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import type { Static, TObject } from "@sinclair/typebox/type";
import { dirtyFormsAtom, chatStore } from "@/store/chat-store";
import { useEffect } from "react";
import { useForm, type DefaultValues } from "react-hook-form";

export function useRpForm<T extends TObject>(
  schema: T,
  values: Static<T> | undefined,
) {
  const form = useForm({
    resolver: typeboxResolver(schema),
    defaultValues: formDefaults(schema) as DefaultValues<Static<T>>,
    values,
    resetOptions: { keepDirtyValues: true },
  });
  useMarkDirtyForm(form.formState.isDirty);
  return form;
}

// Counted so the update reload can wait: an editor with unsaved fields is
// the other thing a page reload throws away.
export function useMarkDirtyForm(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    chatStore.set(dirtyFormsAtom, chatStore.get(dirtyFormsAtom) + 1);
    return () =>
      chatStore.set(
        dirtyFormsAtom,
        Math.max(0, chatStore.get(dirtyFormsAtom) - 1),
      );
  }, [dirty]);
}
