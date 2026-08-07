"use client";

import {
  useCivitaiLoraVersionsQuery,
  useLoraCatalogQuery,
} from "@/hooks/ai/image-catalog-hook";
import type { ModelFamily } from "@/lib/ai/playground/models";
import type { CatalogItem, LoraEntry } from "@/lib/validation/playground";
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
  /** Appends a LoRA's trigger words to the prompt when it is added. A LoRA gated behind a
   *  trigger word contributes NOTHING until that word is in the prompt, which is the most
   *  common reason one looks broken. Editable afterwards, because it lands in the prompt box
   *  rather than being spliced in at submit. */
  onAppendPrompt?: (words: string) => void;
};

// A pasted Civitai link/id names ONE model, so it resolves; anything else is a keyword the
// catalog searches for. Mirrors the checkpoint field, which users already reach for when the
// browse list does not hold what they want - and the LoRA catalog is far larger than the
// checkpoint one, so searching it blind is worse.
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
  // Derived from the DEBOUNCED value, not the live one: reading the raw input flipped this
  // on individual keystrokes (a half-typed url is briefly a bare id), so the panel swapped
  // between the catalog and the resolver on the way to a stable query and flickered through
  // empty/loading states the whole time.
  const isReference = isCivitaiReference(debounced);

  // The provider answers this in seconds, so querying per keystroke would queue a request
  // the user has already typed past.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // A reference resolves through the versions endpoint instead of the catalog: a Civitai
  // LoRA is a family whose weights differ between versions, so the user picks rather than
  // getting whichever one matched first.
  const versions = useCivitaiLoraVersionsQuery(
    isReference ? debounced : undefined,
  );
  const resolved: CatalogItem[] = (versions.data?.items ?? []).map((v) => ({
    id: v.air,
    air: v.air,
    name: v.name,
    architecture: v.architecture,
    category: "lora",
    heroImage: v.heroImage,
    defaultWeight: v.defaultWeight ?? 0.8,
    nsfwLevel: v.nsfwLevel,
    triggerWords: v.triggerWords,
    tags: [],
    downloadCount: null,
    thumbsUpCount: null,
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
