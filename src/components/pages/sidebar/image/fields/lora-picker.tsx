"use client";

import { useLoraCatalogQuery } from "@/hooks/ai/image-catalog-hook";
import type { ModelFamily } from "@/lib/ai/playground/models";
import type { LoraEntry } from "@/lib/validation/playground";
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
  const catalog = useLoraCatalogQuery({
    architecture: familyToArchitecture(props.family),
  });
  return (
    <CatalogChainPicker
      titleKey="IMAGE.LORAS_TITLE"
      emptyKey="IMAGE.LORAS_EMPTY"
      items={catalog.data?.items ?? []}
      isLoading={catalog.isLoading}
      value={props.value}
      onAddPayload={(item) => ({
        name: item.air,
        weight: item.defaultWeight,
      })}
      onChange={props.onChange}
    />
  );
}
