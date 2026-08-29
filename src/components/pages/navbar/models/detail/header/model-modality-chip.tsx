"use client";

import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { IconName } from "@/lib/config/icon-map";
import type { ModelMetadata } from "@/openapi";
import { useTranslations } from "next-intl";

const ICON_MAP: Record<string, IconName> = {
  text: "type",
  image: "image",
  audio: "mic",
  video: "video",
  file: "file",
  pdf: "file",
  embeddings: "brain",
};

function ModalityIcon(props: { modality: string; sideLabel: string }) {
  const t = useTranslations();
  const key = props.modality.toLowerCase();
  const iconName = ICON_MAP[key];
  const name =
    key === "text"
      ? t("MODELS.MODALITY.TEXT")
      : key === "image"
        ? t("MODELS.MODALITY.IMAGE")
        : key === "audio"
          ? t("MODELS.MODALITY.AUDIO")
          : key === "video"
            ? t("MODELS.MODALITY.VIDEO")
            : key === "file" || key === "pdf"
              ? t("MODELS.MODALITY.FILE")
              : key === "embeddings"
                ? t("MODELS.MODALITY.EMBEDDINGS")
                : props.modality;
  if (!iconName) {
    return (
      <span className="font-mono text-[10px] uppercase">{props.modality}</span>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className="inline-flex items-center" />}
        aria-label={`${props.sideLabel}: ${name}`}
      >
        <Icon name={iconName} className="h-3 w-3" />
      </TooltipTrigger>
      <TooltipContent>
        {props.sideLabel}: {name}
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
