"use client";

import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { IconName } from "@/lib/config/icon-map";
import type { TranslationKey } from "@/lib/types";
import type { ModelMetadata } from "@/openapi";
import { useTranslations } from "next-intl";

const MODALITY: Record<string, { icon: IconName; label: TranslationKey }> = {
  text: { icon: "type", label: "MODELS.MODALITY.TEXT" },
  image: { icon: "image", label: "MODELS.MODALITY.IMAGE" },
  audio: { icon: "mic", label: "MODELS.MODALITY.AUDIO" },
  video: { icon: "video", label: "MODELS.MODALITY.VIDEO" },
  file: { icon: "file", label: "MODELS.MODALITY.FILE" },
  pdf: { icon: "file", label: "MODELS.MODALITY.FILE" },
  embeddings: { icon: "brain", label: "MODELS.MODALITY.EMBEDDINGS" },
  decisions: { icon: "git-branch", label: "MODELS.MODALITY.DECISIONS" },
};

function ModalityIcon(props: { modality: string; sideLabel: string }) {
  const t = useTranslations();
  const entry = MODALITY[props.modality.toLowerCase()];
  if (!entry) {
    return (
      <span className="font-mono text-[10px] uppercase">{props.modality}</span>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className="inline-flex items-center" />}
        aria-label={`${props.sideLabel}: ${t(entry.label)}`}
      >
        <Icon name={entry.icon} className="h-3 w-3" />
      </TooltipTrigger>
      <TooltipContent>
        {props.sideLabel}: {t(entry.label)}
      </TooltipContent>
    </Tooltip>
  );
}

export function ModelModalityChip(props: { metadata: ModelMetadata }) {
  const t = useTranslations();
  const inputs = props.metadata.inputModalities ?? [];
  const outputs = props.metadata.outputModalities ?? [];
  if (inputs.length === 0 && outputs.length === 0) return null;

  const inputLabel = t("MODELS.DETAIL.INPUT");
  const outputLabel = t("MODELS.DETAIL.OUTPUT");

  return (
    <span className="border-border/60 bg-muted/40 text-foreground inline-flex items-center gap-1.5 rounded-md border px-2 py-1">
      {inputs.map((mod) => (
        <ModalityIcon key={`in-${mod}`} modality={mod} sideLabel={inputLabel} />
      ))}
      {outputs.length > 0 && (
        <Icon
          name="arrow-right"
          className="text-muted-foreground h-3 w-3 shrink-0"
        />
      )}
      {outputs.map((mod) => (
        <ModalityIcon
          key={`out-${mod}`}
          modality={mod}
          sideLabel={outputLabel}
        />
      ))}
    </span>
  );
}
