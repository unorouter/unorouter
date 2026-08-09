"use client";

import {
  useCivitaiLoraVersionsQuery,
  useLoraCatalogQuery,
} from "@/hooks/ai/image-catalog-hook";
import type { ModelFamily } from "@/lib/ai/image/models";
import type { CatalogItem, LoraEntry } from "@/lib/validation/image";
import { useEffect, useState } from "react";
import {
  CatalogChainPicker,
  familyToArchitecture,
} from "./catalog-chain-picker";

export type { LoraEntry };

type Props = {
  family: ModelFamily;
  value: LoraEntry[];
  onChange: (next: LoraEntry[]) => void;
  /** Appends the LoRA's trigger words to the prompt on add; a gated LoRA does nothing
   *  without them. Lands in the prompt box, so it stays editable. */
  onAppendPrompt?: (words: string) => void;
};

// A pasted Civitai link/id names ONE model and resolves; anything else searches the catalog.
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
  // From the DEBOUNCED value: a half-typed url is briefly a bare id, and the live value
  // flip-flopped the panel between catalog and resolver per keystroke.
  const isReference = isCivitaiReference(debounced);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // A reference resolves through the versions endpoint: a Civitai LoRA is a family
  // whose weights differ between versions, so the user picks.
  const versions = useCivitaiLoraVersionsQuery(
    isReference ? debounced : undefined,
  );
  const resolved: CatalogItem[] = (versions.data?.items ?? []).map((v) => ({
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
  }));

  const catalog = useLoraCatalogQuery(
    isReference
      ? undefined
      : {
          architecture: familyToArchitecture(props.family),
          ...(debounced ? { search: debounced } : {}),
        },
  );

  return (
    <CatalogChainPicker
      titleKey="IMAGE.LORAS_TITLE"
      emptyKey="IMAGE.LORAS_EMPTY"
      items={isReference ? resolved : (catalog.data?.items ?? [])}
      // isFetching, not isLoading: placeholder data keeps isLoading false during the
      // 8-22s search, and stale rows with no pending marker look like a dead search box.
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
