"use client";

import {
  useCivitaiLoraVersionsQuery,
  useLoraCatalogQuery,
} from "@/hooks/ai/image-catalog-hook";
import type { CatalogItem, LoraEntry } from "@/lib/validation/image";
import { useEffect, useState } from "react";
import { CatalogChainPicker } from "./catalog-chain-picker";

export type { LoraEntry };

type Props = {
  /** The provider rejects a LoRA whose architecture differs from the checkpoint's. */
  checkpointArchitecture?: string | null;
  value: LoraEntry[];
  onChange: (next: LoraEntry[]) => void;
  onAppendPrompt?: (words: string) => void;
};

function isCivitaiReference(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  return (
    /^\d+$/.test(trimmed) ||
    /civitai\.com\/models\/\d+/i.test(trimmed) ||
    /(?:^|:)[a-z]+:\d+@\d+$/i.test(trimmed)
  );
}

export function LoraPicker(props: Props) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  // DEBOUNCED, not live: a half-typed url is briefly a bare id, flip-flopping the
  // panel between catalog and resolver per keystroke.
  const isReference = isCivitaiReference(debounced);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const versions = useCivitaiLoraVersionsQuery(
    isReference ? debounced : undefined,
  );
  const checkpointArch = props.checkpointArchitecture ?? undefined;
  const compatible = (arch: string | null | undefined) =>
    !checkpointArch || !arch || arch === checkpointArch;
  const resolved: CatalogItem[] = (versions.data?.items ?? [])
    .map((v) => ({
      id: v.air,
      air: v.air,
      name: v.name,
      architecture: v.architecture,
      heroImage: v.heroImage,
      defaultWeight: v.defaultWeight ?? 0.8,
      nsfwLevel: v.nsfwLevel,
      triggerWords: v.triggerWords,
      tags: [],
      downloadCount: null,
    }))
    .sort(
      (a, b) =>
        Number(compatible(b.architecture)) - Number(compatible(a.architecture)),
    );

  const catalog = useLoraCatalogQuery(
    isReference
      ? undefined
      : {
          architecture: checkpointArch,
          ...(debounced ? { search: debounced } : {}),
        },
  );

  return (
    <CatalogChainPicker
      titleKey="IMAGE.LORAS_TITLE"
      emptyKey="IMAGE.LORAS_EMPTY"
      items={isReference ? resolved : (catalog.data?.items ?? [])}
      // isFetching, not isLoading: placeholder data keeps isLoading false during the
      // 8-22s search.
      isFetching={isReference ? versions.isFetching : catalog.isFetching}
      isLoading={isReference ? versions.isLoading : catalog.isLoading}
      value={props.value}
      search={search}
      onSearchChange={setSearch}
      onAddPayload={(item) => {
        if (item.triggerWords) props.onAppendPrompt?.(item.triggerWords);
        return { name: item.air, weight: item.defaultWeight };
      }}
      onChange={props.onChange}
    />
  );
}
