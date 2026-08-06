"use client";

import { useLoraCatalogQuery } from "@/hooks/ai/image-catalog-hook";
import type { ModelFamily } from "@/lib/ai/playground/models";
import type { LoraEntry } from "@/lib/validation/playground";
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
};

export function LoraPicker(props: Props) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // The provider answers this in seconds, so querying per keystroke would queue a request
  // the user has already typed past.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const catalog = useLoraCatalogQuery({
    architecture: familyToArchitecture(props.family),
    ...(debounced ? { search: debounced } : {}),
  });
  return (
    <CatalogChainPicker
      titleKey="IMAGE.LORAS_TITLE"
      emptyKey="IMAGE.LORAS_EMPTY"
      items={catalog.data?.items ?? []}
      isLoading={catalog.isLoading}
      value={props.value}
      search={search}
      onSearchChange={setSearch}
      onAddPayload={(item) => ({
        name: item.air,
        weight: item.defaultWeight,
      })}
      onChange={props.onChange}
    />
  );
}
