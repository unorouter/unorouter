"use client";

import type { ModelMetadata } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";
import { LuFile, LuImage, LuMic, LuType, LuVideo } from "react-icons/lu";

type IconType = ComponentType<{ className?: string }>;

const ICON_MAP: Record<string, IconType> = {
  text: LuType,
  image: LuImage,
  audio: LuMic,
  video: LuVideo,
  file: LuFile,
  pdf: LuFile,
};

function ModalityIcons(props: { modalities: string[]; emptyLabel: string }) {
  if (props.modalities.length === 0) {
    return (
      <span className="text-muted-foreground/60 font-mono text-[10px]">
        {props.emptyLabel}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      {props.modalities.map((modality) => {
        const Icon = ICON_MAP[modality.toLowerCase()];
        if (!Icon) {
          return (
            <span
              key={modality}
              className="text-muted-foreground font-mono text-[10px] uppercase"
            >
              {modality}
            </span>
          );
        }
        return (
          <span
            key={modality}
            className="text-foreground inline-flex items-center gap-1"
            title={modality}
          >
            <Icon className="h-3 w-3" />
            <span className="font-mono text-[10px] uppercase">{modality}</span>
          </span>
        );
      })}
    </div>
  );
}

type Props = {
  metadata: ModelMetadata;
  className?: string;
};

export function ModalitiesRow(props: Props) {
  const t = useTranslations();
  const inputs = props.metadata.inputModalities ?? [];
  const outputs = props.metadata.outputModalities ?? [];

  if (inputs.length === 0 && outputs.length === 0) return null;

  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", props.className)}>
      <div className="border-border flex items-center justify-between gap-3 rounded-md border px-3 py-2">
        <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
          {t("MODELS.DETAIL.INPUT")}
        </span>
        <ModalityIcons
          modalities={inputs}
          emptyLabel={t("MODELS.DETAIL.NONE")}
        />
      </div>
      <div className="border-border flex items-center justify-between gap-3 rounded-md border px-3 py-2">
        <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
          {t("MODELS.DETAIL.OUTPUT")}
        </span>
        <ModalityIcons
          modalities={outputs}
          emptyLabel={t("MODELS.DETAIL.NONE")}
        />
      </div>
    </div>
  );
}
