"use client";

import { useEmbeddingCatalogQuery } from "@/hooks/ai/image-catalog-hook";
import type { ModelFamily } from "@/lib/ai/playground/models";
import {
  CatalogChainPicker,
  familyToArchitecture,
} from "./catalog-chain-picker";

export type EmbeddingEntry = {
  name: string;
  weight: number;
};

type Props = {
  family: ModelFamily;
  value: EmbeddingEntry[];
  onChange: (next: EmbeddingEntry[]) => void;
};

export function EmbeddingPicker(props: Props) {
  const catalog = useEmbeddingCatalogQuery({
    architecture: familyToArchitecture(props.family),
  });
  return (
    <CatalogChainPicker
      titleKey="IMAGE.EMBEDDINGS_TITLE"
      emptyKey="IMAGE.EMBEDDINGS_EMPTY"
      items={catalog.data?.items ?? []}
      isLoading={catalog.isLoading}
      value={props.value}
      onAddPayload={(item) => ({ name: item.air, weight: 1.0 })}
      onChange={props.onChange}
    />
  );
}
