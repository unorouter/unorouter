"use client";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";
import { msg } from "@/lib/config/constants";
import {
  countByOutputModality,
  OUTPUT_MODALITIES,
  type OutputModality,
} from "@/lib/api/model-modality";
import type { ProcessedModel } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const MODALITY_ICON: Record<OutputModality, IconName> = {
  text: "type",
  image: "image",
  audio: "mic",
  video: "video",
  embeddings: "layers",
};

const MODALITY_LABEL_KEY = {
  text: msg("MODELS.MODALITY.TEXT"),
  image: msg("MODELS.MODALITY.IMAGE"),
  audio: msg("MODELS.MODALITY.AUDIO"),
  video: msg("MODELS.MODALITY.VIDEO"),
  embeddings: msg("MODELS.MODALITY.EMBEDDINGS"),
} satisfies Record<OutputModality, ReturnType<typeof msg>>;

export function ModalityTabs(props: {
  models: ProcessedModel[];
  value: OutputModality;
  onChange: (value: OutputModality) => void;
}) {
  const t = useTranslations();
  const counts = countByOutputModality(props.models);

  return (
    <div className="border-border flex gap-1 overflow-x-auto border-b pb-px">
      {OUTPUT_MODALITIES.map((modality) => {
        const active = props.value === modality;
        return (
          <button
            key={modality}
            type="button"
            onClick={() => props.onChange(modality)}
            aria-pressed={active}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 font-mono text-sm whitespace-nowrap transition-colors",
              active
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            <Icon name={MODALITY_ICON[modality]} className="h-4 w-4" />
            <span>{t(MODALITY_LABEL_KEY[modality])}</span>
            <span className="text-muted-foreground text-xs">
              {counts[modality]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
